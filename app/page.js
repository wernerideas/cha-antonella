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
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [jaConfirmouInfo, setJaConfirmouInfo] = useState(null);
  const [checando, setChecando] = useState(false);
  const [trocandoMimo, setTrocandoMimo] = useState(false);
  const [mensagemTroca, setMensagemTroca] = useState('');

  useEffect(() => {
    async function carregarMimos() {
      const { data } = await getSupabase().from('mimos').select('*').order('id');
      if (data) setMimos(data);
    }
    carregarMimos();
  }, []);

  async function checarWhatsapp() {
    if (whatsapp.trim() === '') return;
    setChecando(true);
    const resposta = await fetch(`/api/verificar?whatsapp=${encodeURIComponent(whatsapp)}`);
    const dados = await resposta.json();
    setChecando(false);
    setJaConfirmouInfo(dados.jaConfirmou ? dados : null);
  }

  const podeConfirmar =
    nome.trim() !== '' &&
    whatsapp.trim() !== '' &&
    fraldaSelecionada &&
    !enviando &&
    !jaConfirmouInfo;

  async function handleConfirmar() {
    setEnviando(true);
    setErro('');
    const resposta = await fetch('/api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, whatsapp, mimoId: mimoSelecionadoId }),
    });
    const dados = await resposta.json();
    setEnviando(false);

    if (resposta.ok) {
      setResultado(dados);
    } else if (resposta.status === 409) {
      setErro('Esse WhatsApp já confirmou presença antes.');
    } else {
      setErro('Algo deu errado, tenta de novo em alguns segundos.');
    }
  }

  async function handleTrocarMimo(novoMimoId) {
    setTrocandoMimo(true);
    setMensagemTroca('');
    const resposta = await fetch('/api/trocar-mimo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp, novoMimoId }),
    });
    const dados = await resposta.json();
    setTrocandoMimo(false);

    if (resposta.ok) {
      setJaConfirmouInfo({ jaConfirmou: true, ...dados });
      const nomeMimo = dados.mimoNome
        ? dados.mimoNome + (dados.mimoTamanho ? ` (${dados.mimoTamanho})` : '')
        : 'nenhum mimo';
      setMensagemTroca(`Tudo certo! Seu mimo agora é: ${nomeMimo}`);
      const { data } = await getSupabase().from('mimos').select('*').order('id');
      if (data) setMimos(data);
    } else if (dados.motivo === 'mimo_indisponivel') {
      setMensagemTroca('Ih, esse mimo acabou de ser reservado por outra pessoa. Escolhe outro.');
    } else {
      setMensagemTroca('Algo deu errado, tenta de novo em alguns segundos.');
    }
  }

  if (resultado) {
    const nomeMimo = resultado.mimoNome
      ? resultado.mimoNome + (resultado.mimoTamanho ? ` (${resultado.mimoTamanho})` : '')
      : null;
    return (
      <div className="page">
        <div className="hero">
          <p className="name">Obrigada!</p>
          <p className="datetime">Sua presença está confirmada</p>
        </div>
        <div className="section">
          <p className="section-title" style={{ fontSize: 22 }}>O que você vai trazer</p>
          <div className="item-box">
            <p className="item-name">Fralda tamanho {resultado.fraldaSize}</p>
          </div>
          <p className="section-subtitle" style={{ textAlign: 'left', marginTop: -4 }}>
            Marca: Pampers Premium Care ou Huggies Natural Care
          </p>
          {nomeMimo && (
            <div className="item-box" style={{ marginTop: 14 }}>
              <p className="item-name">{nomeMimo}</p>
            </div>
          )}
          <p className="section-subtitle" style={{ marginTop: 18 }}>15/08 &bull; 15:00h</p>
          <p className="section-subtitle">Rua Ver. Dino Gasparin, 129</p>
        </div>
        <p className="footer-note">
          Relaxa, não precisa anotar nada — essa mesma mensagem já está a caminho do seu WhatsApp 💛
        </p>
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
        <p className="address" style={{ color: '#000', fontStyle: 'italic' }}>
          Este site não vende nada, é só uma lista pra organizar que leva o quê.
        </p>
      </div>

      <div className="section">
        <p className="section-subtitle" style={{ marginBottom: 6, fontWeight: 700 }}>
          Confirmação individual, mesmo pra quem vem acompanhado
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
          onBlur={checarWhatsapp}
        />
        {checando && <p className="section-subtitle" style={{ textAlign: 'left' }}>Verificando...</p>}

        {jaConfirmouInfo && (
          <div className="item-box unavailable" style={{ opacity: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
            <p className="item-name" style={{ textDecoration: 'none', fontWeight: 700 }}>
              Você já confirmou presença!
            </p>
            <p className="item-name" style={{ textDecoration: 'none', fontSize: 14, marginTop: 6 }}>
              Fralda tamanho {jaConfirmouInfo.fraldaSize}
              {jaConfirmouInfo.mimoNome
                ? ` + ${jaConfirmouInfo.mimoNome}${jaConfirmouInfo.mimoTamanho ? ` (${jaConfirmouInfo.mimoTamanho})` : ''}`
                : ''}
            </p>
          </div>
        )}
      </div>

      {jaConfirmouInfo && (
        <div className="section">
          <p className="section-title">Quer trocar de mimo?</p>
          <p className="section-subtitle">Escolha outro item que a gente atualiza pra você</p>
          {mensagemTroca && (
            <p style={{ color: '#B8863F', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
              {mensagemTroca}
            </p>
          )}
          {mimos.map((mimo) => {
            const indisponivel = mimo.reserved_qty >= mimo.total_qty;
            const nomeCompleto = mimo.name + (mimo.size ? ` (${mimo.size})` : '');
            const eOAtual = jaConfirmouInfo.mimoNome === mimo.name && jaConfirmouInfo.mimoTamanho === mimo.size;
            return (
              <div
                key={mimo.id}
                className={`item-box ${eOAtual ? 'reserved-by-me' : ''} ${indisponivel && !eOAtual ? 'unavailable' : ''}`}
              >
                <p className="item-name">{nomeCompleto}</p>
                <button
                  className="item-btn"
                  disabled={eOAtual || (indisponivel && !eOAtual) || trocandoMimo}
                  onClick={() => handleTrocarMimo(mimo.id)}
                >
                  {eOAtual ? 'Seu mimo atual' : indisponivel ? 'Indisponível' : 'Trocar pra este'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!jaConfirmouInfo && (
        <>
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
            <p className="section-subtitle" style={{ marginTop: 10 }}>
              Reserve um pacote — a gente te avisa no seu WhatsApp qual tamanho (RN, P, M ou G) e a marca, assim que você confirmar
            </p>
          </div>

          <div className="divider" />

          <div className="section">
            <p className="section-title">Sugestão de mimo</p>
            <p className="section-subtitle">Cada mimo só pode ser escolhido por uma pessoa</p>
            {mimos.map((mimo) => {
              const indisponivel = mimo.reserved_qty >= mimo.total_qty;
              const selecionadoPorMim = mimoSelecionadoId === mimo.id;
              return (
                <div
                  key={mimo.id}
                  className={`item-box ${selecionadoPorMim ? 'reserved-by-me' : ''} ${indisponivel ? 'unavailable' : ''}`}
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
            {erro && (
              <p style={{ color: '#B8863F', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                {erro}
              </p>
            )}
            <button className="confirm-btn" disabled={!podeConfirmar} onClick={handleConfirmar}>
              {enviando ? 'Enviando...' : 'Confirmar presença'}
            </button>
          </div>
        </>
      )}

      <p className="footer-note">Sua presença tornará esse dia ainda mais especial</p>
    </div>
  );
}
