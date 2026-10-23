# Sexta-Feira PWA — versão 0.1

Protótipo inicial instalável, com:
- interface responsiva;
- fala por síntese de voz do navegador;
- reconhecimento de voz quando suportado;
- memórias e histórico locais no navegador;
- atalhos web;
- cache básico para abrir a interface offline.

## Limitações desta versão
- **Ainda não existe um modelo de IA conectado.** O chat usa respostas locais demonstrativas.
- A voz depende das vozes instaladas/disponíveis no Android e no navegador.
- Reconhecimento de fala pode exigir internet e permissões, mesmo com a interface offline.
- A PWA não controla livremente outros apps nem configurações protegidas.
- Memórias ficam no armazenamento local do navegador deste aparelho; limpar dados do navegador pode apagá-las.
- O cache offline funciona melhor depois de abrir a aplicação pelo menos uma vez com internet.

## Como publicar pelo celular
1. Crie uma conta num serviço de hospedagem estática confiável que aceite HTTPS e envio de arquivos.
2. Envie os arquivos desta pasta mantendo os nomes e a estrutura.
3. Abra o endereço HTTPS publicado no Chrome do Samsung.
4. No menu ⋮, toque em **Instalar app** ou **Adicionar à tela inicial**.
5. Abra a aplicação uma vez online e teste a memória e a voz.

## Próxima etapa: IA online com segurança
Use um backend/serverless function para fazer chamadas à API do provedor de IA. Guarde a chave secreta apenas como variável de ambiente no servidor. **Nunca coloque uma chave de API em `app.js`, HTML ou outro arquivo público.**

## Próxima etapa: IA offline
Será necessário integrar um modelo pequeno compatível com Android, via aplicativo nativo ou runtime local compatível. O service worker apenas guarda os arquivos da interface; ele não transforma o site num modelo de linguagem offline.
