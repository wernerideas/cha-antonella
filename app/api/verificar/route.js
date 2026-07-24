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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const whatsapp = searchParams.get('whatsapp') || '';
  const telefoneFormatado = formatarTelefone(whatsapp);

  const supabase = getSupabaseAdmin();
  const { data: convidado } = await supabase
    .from('convidados')
    .select('*, mimos(name, size)')
    .eq('whatsapp_formatado', telefoneFormatado)
    .maybeSingle();

  if (!convidado) {
    return Response.json({ jaConfirmou: false });
  }

  return Response.json({
    jaConfirmou: true,
    fraldaSize: convidado.fralda_size,
    mimoNome: convidado.mimos ? convidado.mimos.name : null,
    mimoTamanho: convidado.mimos ? convidado.mimos.size : null,
  });
}
