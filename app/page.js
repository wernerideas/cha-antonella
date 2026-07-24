'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function Home() {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [fraldaSelecionada, setFraldaSelecionada] = useState(false);
  const [mimos, setMimos] = useState([]);
  const [mimoSelecionadoId, setMimoSelecionadoId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    async function carregarMimos() {
      const { data } = await getSupabase().from('mimos').select('*').order('id');
      if (data) setMimos(data);
    }
    carregarMimos();
  }, []);

  const podeConfirmar =
    nome.trim() !== '' &&
    whatsapp.trim() !== '' &&
    fraldaSelecionada &&
    mimoSelecionadoId !== null &&
    !enviando;

  async function handleConfirmar() {
    setEnviando(true);
    const resposta = await fetch('/api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        whatsapp,
        mimoId: mimoSelecionadoId,
      }),
    });
    setEnviando(false);
    if (resposta.ok) {
      setConfirmado(true);
    } else {
      alert('Algo deu errado, tenta de novo em alguns segundos.');
    }
  }

  if (confirmado) {
    return (
      <div className="page">
        <div className="hero">
          <p className="name">Obrigada!</p>
          <p className="datetime">Sua reserva foi confirmada</p>
          <p className="address">Você vai receber os detalhes no seu WhatsApp em instantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="hero">
        <p className="eyebrow">Você é nosso convidado para o</p>
        <p className="eyebrow">Chá de bebê</p>
        <p className="eyebrow">da nossa princesa</p>
        <p className="name">Antonella</p>
        <p className="datetime">15/08 &bull; 15:00h</p>
        <p className="address">Rua Ver. Dino Gasparin, 129</p>
      </div>

      <div className="section">
        <p className="section-subtitle" style={{ marginBottom: 6 }}>
          Seus dados
        </p>
        <p className="section-subtitle">Preencha antes de reservar seus itens</p>
        <input
          className="field"
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="field"
          placeholder="Seu WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>

      <div className="section">
        <p className="section-title">Reserve sua fralda</p>
        <p className="section-subtitle">Cada convidado leva um pacote de fraldas</p>
        <div className={`item-box ${fraldaSelecionada ? 'reserved-by-me' : ''}`}>
          <p className="item-name">Pacote de fraldas</p>
          <button
            className="item-btn"
            disabled={fraldaSelecionada}
            onClick={() => setFraldaSelecionada(true)}
          >
            {fraldaSelecionada ? 'Reservado' : 'Reserve sua fralda'}
          </button>
        </div>
      </div>

      <div className="divider" />

      <div className="section">
        <p className="section-title">Reserve seu mimo</p>
        <p className="section-subtitle">Cada mimo só pode ser escolhido por uma pessoa</p>
        {mimos.map((mimo) => {
          const indisponivel = mimo.reserved_qty >= mimo.total_qty;
          const selecionadoPorMim = mimoSelecionadoId === mimo.id;
          return (
            <div
              key={mimo.id}
              className={`item-box ${selecionadoPorMim ? 'reserved-by-me' : ''} ${
                indisponivel ? 'unavailable' : ''
              }`}
            >
              <p className="item-name">
                {mimo.name}
                {mimo.size ? ` (${mimo.size})` : ''}
              </p>
              <button
                className="item-btn"
                disabled={indisponivel || (mimoSelecionadoId !== null && !selecionadoPorMim)}
                onClick={() => setMimoSelecionadoId(mimo.id)}
              >
                {indisponivel ? 'Indisponível' : selecionadoPorMim ? 'Reservado' : 'Vou levar'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="section">
        <button className="confirm-btn" disabled={!podeConfirmar} onClick={handleConfirmar}>
          {enviando ? 'Enviando...' : 'Confirmar presença'}
        </button>
      </div>

      <p className="footer-note">Sua presença tornará esse dia ainda mais especial</p>
    </div>
  );
}
