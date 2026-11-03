import { useEffect, useState } from "react";
import { api } from "../../services/api";
import NFUpload from "./NFUpload";
import NFReview from "./NFReview";
import ProductForm from "./ProductForm";
import LabelConfirm from "./LabelConfirm";
import NFSuccess from "./NFSuccess";

/*
  Controla o fluxo da entrada por NF:
  upload -> (IA lê) -> conferência -> cadastro de cada produto novo + etiqueta -> sucesso -> recomeça.
  A auditoria da NF é gravada uma vez só, no final (api.notasFiscais.finalizar).
*/
const estadoInicial = {
  etapa: "upload", // upload | cadastro | etiqueta | sucesso
  arquivoUrl: null, leitura: null, itens: [], nome: "",
  notaId: null, novos: [], indice: 0, produtoCriado: null,
};

export default function NovaEntrada() {
  const [s, setS] = useState(estadoInicial);
  const [lendo, setLendo] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // libera a memória da pré-visualização quando sair da tela
  useEffect(() => () => { if (s.arquivoUrl) URL.revokeObjectURL(s.arquivoUrl); }, [s.arquivoUrl]);

  const recomecar = () => { setS(estadoInicial); setRevisando(false); setErro(""); };

  const aoEscolherArquivo = async (arquivo) => {
    setErro("");
    setLendo(true);
    setS((x) => ({ ...x, arquivoUrl: URL.createObjectURL(arquivo) }));
    try {
      const leitura = await api.notasFiscais.lerImagem(arquivo);
      setS((x) => ({ ...x, leitura, itens: leitura.itens, nome: leitura.nomeSugerido }));
      setRevisando(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLendo(false);
    }
  };

  const concluirFluxo = async (notaId, nome, soExistentes) => {
    await api.notasFiscais.finalizar(notaId);
    setS((x) => ({ ...x, etapa: "sucesso", nome, soExistentes }));
  };

  const confirmarConferencia = async () => {
    setErro("");
    setEnviando(true);
    try {
      const nome = s.nome.trim();
      const { notaId, produtosNovos } = await api.notasFiscais.confirmar({
        leituraId: s.leitura.leituraId,
        nome,
        itens: s.itens.map((i) => ({
          id: i.id, produtoId: i.produtoVinculado?.id ?? null, descricaoOriginal: i.descricaoOriginal.trim(),
          quantidade: i.quantidade, unidade: i.unidade.trim(), valorUnitario: i.valorUnitario,
        })),
      });
      setRevisando(false);
      if (produtosNovos.length === 0) {
        await concluirFluxo(notaId, nome, true);
      } else {
        setS((x) => ({ ...x, notaId, novos: produtosNovos, indice: 0, etapa: "cadastro" }));
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const salvarProdutoNovo = async (dados) => {
    setErro("");
    setEnviando(true);
    try {
      const produto = await api.notasFiscais.cadastrarProdutoNovo(s.notaId, s.novos[s.indice], dados);
      setS((x) => ({ ...x, produtoCriado: produto, etapa: "etiqueta" }));
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const finalizar = async () => {
    setErro("");
    setEnviando(true);
    try {
      await concluirFluxo(s.notaId, s.nome.trim(), false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (s.etapa === "cadastro") {
    return <ProductForm key={s.indice} item={s.novos[s.indice]} indice={s.indice} total={s.novos.length} onSave={salvarProdutoNovo} salvando={enviando} erro={erro} />;
  }
  if (s.etapa === "etiqueta") {
    const temProximo = s.indice < s.novos.length - 1;
    return (
      <LabelConfirm produto={s.produtoCriado} temProximo={temProximo} finalizando={enviando} erro={erro}
        onNext={() => { setErro(""); setS((x) => ({ ...x, indice: x.indice + 1, etapa: "cadastro" })); }}
        onFinish={finalizar} />
    );
  }
  if (s.etapa === "sucesso") {
    return <NFSuccess nome={s.nome} soExistentes={!!s.soExistentes} onDone={recomecar} />;
  }

  return (
    <>
      <NFUpload onFile={aoEscolherArquivo} lendo={lendo} previewUrl={s.arquivoUrl} erro={revisando ? "" : erro} />
      {revisando && (
        <NFReview
          itens={s.itens} setItens={(itens) => setS((x) => ({ ...x, itens }))}
          nome={s.nome} setNome={(nome) => setS((x) => ({ ...x, nome }))}
          onConfirm={confirmarConferencia} onCancel={recomecar} enviando={enviando} erro={erro} />
      )}
    </>
  );
}
