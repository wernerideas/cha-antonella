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
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: formatarTelefone(telefone),
      message: mensagem,
    }),
  });
  const corpo = await resposta.text();
  console.log('Resposta Z-API:', resposta.status, corpo);
}

export async function POST(request) {
  try {
    const { whatsapp, novoMimoId } = await request.json();
    const supabase = getSupabaseAdmin();
    const telefoneFormatado = formatarTelefone(whatsapp);

    const { data: convidado } = await supabase
      .from('convidados')
      .select('*')
      .eq('whatsapp_formatado', telefoneFormatado)
      .maybeSingle();

    if (!convidado) {
      return Response.json({ ok: false, motivo: 'nao_encontrado' }, { status: 404 });
    }

    // Se o mimo escolhido já é o que ela tem, não faz nada
    if (convidado.mimo_id === novoMimoId) {
      const { data: mimoAtual } = novoMimoId
        ? await supabase.from('mimos').select('*').eq('id', novoMimoId).single()
        : { data: null };
      return Response.json({
        ok: true,
        fraldaSize: convidado.fralda_size,
        mimoNome: mimoAtual ? mimoAtual.name : null,
        mimoTamanho: mimoAtual ? mimoAtual.size : null,
      });
    }

    // Checar se o novo mimo ainda está disponível
    let novoMimo = null;
    if (novoMimoId) {
      const { data: mimoEncontrado } = await supabase
        .from('mimos')
        .select('*')
        .eq('id', novoMimoId)
        .single();
      novoMimo = mimoEncontrado;

      if (novoMimo.reserved_qty >= novoMimo.total_qty) {
        return Response.json({ ok: false, motivo: 'mimo_indisponivel' }, { status: 409 });
      }
    }

    // Devolver o mimo antigo pro estoque
    if (convidado.mimo_id) {
      const { data: mimoAntigo } = await supabase
        .from('mimos')
        .select('*')
        .eq('id', convidado.mimo_id)
        .single();
      if (mimoAntigo) {
        await supabase
          .from('mimos')
          .update({ reserved_qty: Math.max(0, mimoAntigo.reserved_qty - 1) })
          .eq('id', convidado.mimo_id);
      }
    }

    // Reservar o novo mimo
    if (novoMimoId) {
      await supabase
        .from('mimos')
        .update({ reserved_qty: novoMimo.reserved_qty + 1 })
        .eq('id', novoMimoId);
    }

    // Atualizar o convidado
    await supabase
      .from('convidados')
      .update({ mimo_id: novoMimoId || null })
      .eq('id', convidado.id);

    // Avisar a pessoa
    const nomeMimo = novoMimo ? novoMimo.name + (novoMimo.size ? ` (${novoMimo.size})` : '') : null;
    const mensagem =
      `Oi, ${convidado.nome}! Sua reserva foi atualizada 💛\n\n` +
      `O que você vai trazer agora:\n` +
      `• Fralda tamanho ${convidado.fralda_size} (Pampers Premium Care ou Huggies Natural Care)\n` +
      (nomeMimo ? `• ${nomeMimo}\n\n` : `\n`) +
      `Data: 15/08 às 15h\nLocal: Rua Ver. Dino Gasparin, 129`;
    await enviarWhatsapp(whatsapp, mensagem);

    // Avisar os pais
    const resumoTroca = `${convidado.nome} trocou o mimo. Agora leva: fralda ${convidado.fralda_size}` +
      (nomeMimo ? ` + ${nomeMimo}` : ' (sem mimo)');
    await enviarWhatsapp(process.env.PAIS_WHATSAPP, resumoTroca);
    if (process.env.PAIS_WHATSAPP_2) {
      await enviarWhatsapp(process.env.PAIS_WHATSAPP_2, resumoTroca);
    }

    return Response.json({
      ok: true,
      fraldaSize: convidado.fralda_size,
      mimoNome: novoMimo ? novoMimo.name : null,
      mimoTamanho: novoMimo ? novoMimo.size : null,
    });
  } catch (erro) {
    console.error(erro);
    return Response.json({ ok: false }, { status: 500 });
  }
}
