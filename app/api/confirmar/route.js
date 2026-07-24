import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function formatarTelefone(numero) {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.startsWith('55')) return digitos;
  return '55' + digitos;
}

async function enviarWhatsapp(telefone, mensagem) {
  const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: formatarTelefone(telefone),
      message: mensagem,
    }),
  });
}

export async function POST(request) {
  try {
    const { nome, whatsapp, mimoId } = await request.json();
    const supabase = getSupabaseAdmin();

    const telefoneFormatado = formatarTelefone(whatsapp);
const { data: existente } = await supabase
  .from('convidados')
  .select('id')
  .eq('whatsapp_formatado', telefoneFormatado)
  .maybeSingle();
if (existente) {
  return Response.json({ ok: false, motivo: 'ja_confirmou' }, { status: 409 });
}

    // 1. Descobrir o próximo tamanho de fralda disponível (RN -> P -> M -> G)
    const { data: fraldas } = await supabase
      .from('fraldas')
      .select('*')
      .order('size');

    const ordemTamanhos = ['RN', 'P', 'M', 'G'];
    let tamanhoEscolhido = null;
    for (const tamanho of ordemTamanhos) {
      const linha = fraldas.find((f) => f.size === tamanho);
      if (linha && linha.reserved_qty < linha.total_qty) {
        tamanhoEscolhido = tamanho;
        break;
      }
    }
    if (!tamanhoEscolhido) tamanhoEscolhido = 'G';

    await supabase
      .from('fraldas')
      .update({ reserved_qty: fraldas.find((f) => f.size === tamanhoEscolhido).reserved_qty + 1 })
      .eq('size', tamanhoEscolhido);

    // 2. Marcar o mimo como reservado (só se a pessoa escolheu um)
    let mimo = null;
    if (mimoId) {
      const { data: mimoEncontrado } = await supabase
        .from('mimos')
        .select('*')
        .eq('id', mimoId)
        .single();
      mimo = mimoEncontrado;

      await supabase
        .from('mimos')
        .update({ reserved_qty: mimo.reserved_qty + 1 })
        .eq('id', mimoId);
    }

    // 3. Salvar o convidado
    await supabase.from('convidados').insert({
      nome,
      whatsapp,
      fralda_size: tamanhoEscolhido,
      mimo_id: mimoId || null,
    });

    // 4. Mandar WhatsApp pro convidado
    const nomeMimo = mimo ? mimo.name + (mimo.size ? ` (${mimo.size})` : '') : null;
    const mensagemConvidado =
      `Oi, ${nome}! Obrigada por confirmar presença no chá de bebê da Antonella 💛\n\n` +
      `O que você vai trazer:\n` +
      `• Fralda tamanho ${tamanhoEscolhido} (Pampers Premium Care ou Huggies Natural Care)\n` +
      (nomeMimo ? `• ${nomeMimo}\n\n` : `\n`) +
      `Data: 15/08 às 15h\nLocal: Rua Ver. Dino Gasparin, 129\n\nAté lá!`;
    await enviarWhatsapp(whatsapp, mensagemConvidado);

    // 5. Mandar resumo geral pros pais
    const { data: todasFraldas } = await supabase.from('fraldas').select('*').order('size');
    const { data: todosMimos } = await supabase.from('mimos').select('*').order('id');

    let resumo = `Nova confirmação: ${nome} (${whatsapp})\nLevou: fralda ${tamanhoEscolhido}` +
      (nomeMimo ? ` + ${nomeMimo}\n\n` : ` (sem mimo)\n\n`);
    resumo += `--- Fraldas ---\n`;
    todasFraldas.forEach((f) => {
      resumo += `${f.size}: ${f.reserved_qty}/${f.total_qty}\n`;
    });
    resumo += `\n--- Mimos ---\n`;
    todosMimos.forEach((m) => {
      const nomeCompleto = m.name + (m.size ? ` (${m.size})` : '');
      resumo += `${nomeCompleto}: ${m.reserved_qty}/${m.total_qty}\n`;
    });
    await enviarWhatsapp(process.env.PAIS_WHATSAPP, resumo);
      if (process.env.PAIS_WHATSAPP_2) {
    await enviarWhatsapp(process.env.PAIS_WHATSAPP_2, resumo);
  }

    return Response.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    return Response.json({ ok: false }, { status: 500 });
  }
}
