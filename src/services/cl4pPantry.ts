/** Envia ao hub CL4P-RZ notas, itens e essenciais em falta (contrato "smartpantry", schema 1). */
import { cl4pCapturarDaUrl, cl4pPublicar } from './cl4pLink';
import { PantryStore, subscribeToPantry } from './storage';

const DIAS_HISTORICO = 400;

function montar() {
  const limite = Date.now() - DIAS_HISTORICO * 86_400_000;
  const produtos = new Map(PantryStore.getProdutos().map((p) => [p.id, p]));
  return {
    notas: PantryStore.getNotas()
      .filter((n) => Date.parse(n.dataEmissao) >= limite)
      .map((n) => ({ chave: n.chaveAcesso, emitente: n.emitenteNome, data: n.dataEmissao, total: n.total })),
    lotes: PantryStore.getLotes()
      .filter((l) => l.status === 'ativo' || Date.parse(l.compradoEm) >= limite)
      .map((l) => {
        const p = produtos.get(l.produtoId);
        return {
          id: l.id,
          nome: p?.nomeCanonico || l.nomeBruto,
          categoria: p?.categoria || 'outros',
          quantidadeInicial: l.quantidadeInicial,
          quantidadeRestante: l.quantidadeRestante,
          unidade: l.unidade,
          precoUnitario: l.precoUnitario,
          compradoEm: l.compradoEm,
          validade: l.validadeEstimada,
          status: l.status,
        };
      }),
    essenciaisFaltando: PantryStore.getEssenciaisComStatus()
      .filter((e) => e.emFalta)
      .map((e) => e.nome),
  };
}

/** Liga o envio: captura ?cl4p= da URL, publica agora e a cada alteração da despensa. */
export function iniciarCl4p() {
  cl4pCapturarDaUrl();
  const publicar = () => cl4pPublicar('smartpantry', montar);
  publicar();
  subscribeToPantry(publicar);
}
