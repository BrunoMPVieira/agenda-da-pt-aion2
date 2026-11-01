# ⚔️ Agenda da PT - AION 2 | Hospedado na Vercel com Banco Supabase

Aplicação web interativa criada para gerenciar os horários, rotinas, personagens principais e alts da PT de **AION 2**.

---

## 🚀 Links Oficiais da PT (Online na Vercel)
> 🔗 **Acesse na Vercel:** [https://agenda-da-pt-aion2.vercel.app](https://agenda-da-pt-aion2.vercel.app)
*(Hospedado na Vercel e conectado diretamente ao banco de dados Supabase com sincronização em tempo real).*

---

## 🛡️ Créditos & Autoria
**DESENVOLVIDO POR - Kharnoxy**

---

## 👥 Membros da PT & Acesso ao Sistema

O sistema conta com autenticação individual para os 4 integrantes. Ao fazer login, cada um pode confirmar sua presença ou registrar justificativas/anotações que aparecem em tempo real para os outros membros no Windows.

| Jogador | Classe Main | Vida Real / Rotina | Alts Disponíveis | Senha Padrão |
| :--- | :--- | :--- | :--- | :--- |
| **Kharnoxy** | **Templário** 🛡️ (Tank) | Programador Home Office. Disponível às 19h (às vezes presencial). FDS flexível. | 🔮 1 Mago / 🌿 1 Healer | `1234` |
| **CIROC** | **Mago** 🔮 (DPS) | Chega às 15:00 do trabalho presencial. Tarde/Noite livre. FDS flexível. | 🌿 2 Healers / 🔮 1 Mago | `1234` |
| **Hell** | **Healer** 🌿 (Suporte) | Aposentado. Livre o dia todo, **exceto das 22:00 às 00:00** (Raven Online). | 🌿 1 Healer / 🔮 1 Mago | `1234` |
| **Rafaxdwar** | **Guerreiro** ⚔️ (DPS/Flex) | Streamer e pai de família. **19:00** é o horário sagrado de jogo. FDS livre. | 🛡️ 1 Templário / ⚔️ 1 Gladiador | `1234` |

*(As senhas podem ser facilmente modificadas na tabela `members_auth` no Supabase ou via modal).*

---

## 🔔 Sistema de Apito & Alarme no Windows

O aplicativo foi configurado para rodar com o navegador aberto no Windows (em primeiro plano ou minimizado) e emitir alertas sonoros e notificações de desktop:

1. **Às 15:55**: Aviso sonoro e notificação no Windows (*Faltam 5 minutos para o Abismo em Grupo*).
2. **Às 16:00**: **APITO OFICIAL DO ABISMO** (Fanfarra sonora e notificação de ação).
3. **Às 18:55**: Aviso sonoro e notificação no Windows (*Faltam 5 minutos para a PT das 19:00*).
4. **Às 19:00**: **APITO OFICIAL DA PT / DUNGEONS / ALTS** (Fanfarra de reunião da PT).
5. **Botão "🔊 Testar Apito"**: Localizado no topo da página, permite testar imediatamente o som e a notificação do Windows.

---

## 🗄️ Como Conectar o Banco de Dados Gratuito no Supabase

O projeto já inclui o script SQL completo no arquivo **[`supabase_setup.sql`](file:///c:/Users/bruno/Desktop/Projects/Agenda%20da%20PT/supabase_setup.sql)**.

Para ativar a sincronização em tempo real entre os computadores dos seus amigos:
1. Acesse **[supabase.com](https://supabase.com)** e crie uma conta / projeto gratuito.
2. Abra o menu **SQL Editor** no painel do Supabase.
3. Copie todo o conteúdo do arquivo [`supabase_setup.sql`](file:///c:/Users/bruno/Desktop/Projects/Agenda%20da%20PT/supabase_setup.sql) e clique em **Run**.
4. Vá em **Project Settings -> API** e copie:
   * **Project URL** (ex: `https://xyz.supabase.co`)
   * **Project API Keys (anon public)**
5. Na página da Agenda, clique no botão **⚙️ Supabase** no canto superior direito, cole as duas chaves e clique em **Salvar e Conectar**.
6. Pronto! A partir desse momento, quando qualquer um confirmar presença ou deixar uma anotação, todos os computadores com a página aberta atualizam instantaneamente via **Realtime**!

*(Caso o Supabase não esteja configurado, a página continuará funcionando perfeitamente em modo Local/Offline).*

---

## 📅 Grade de Horários da PT

* **Segunda e Terça-feira**:
  * `16:00` - Abismo em Grupo (1h diária de AP/PvP)
  * `19:00` - **Upar Alts em Grupo** 🚀 (Simulador de composições integrado)
* **Quarta, Quinta e Sexta-feira**:
  * `16:00` - Abismo em Grupo (1h diária de AP/PvP)
  * `19:00` - **DUNGEONS OFICIAIS DA PT** 🏰🔥 (Foco total nos Mains)
* **Sábado e Domingo**:
  * Livre / Flexível. Kharnoxy e CIROC podem estar ausentes. Hell e Rafax aproveitam para upar alts ou farm solo.

---

## 🚀 Como Abrir
Basta dar um duplo-clique no arquivo **[`index.html`](file:///c:/Users/bruno/Desktop/Projects/Agenda%20da%20PT/index.html)**.
