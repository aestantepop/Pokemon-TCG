/**
 * Carrega um JSON que faz parte do app.
 *
 * Fica isolado num modulo porque a versao de arquivo unico (binder.html)
 * substitui esta funcao por uma leitura dos dados ja embutidos na pagina --
 * assim o app abre com dois cliques, sem servidor.
 */
export async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Não consegui carregar ${path} (HTTP ${res.status})`);
  return res.json();
}
