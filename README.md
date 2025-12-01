# Fluency2Work (MERN)

Admin + app para treinar conversações, lições e vocabulário com áudio integrado.

## Desenvolvimento local

1. **MongoDB** rodando em `mongodb://localhost:27017/fluency` (ou atualize `MONGO_URI` no `.env`).
2. **`.env` na raiz** (não versionado):
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/fluency
   JWT_SECRET=<sua-chave>
   MAGALU_OBJECT_KEY_ID=<key>
   MAGALU_OBJECT_KEY_SECRET=<secret>
   MAGALU_OBJECT_BUCKET=<bucket>
   MAGALU_OBJECT_ENDPOINT=https://br-se1.magaluobjects.com
   MAGALU_OBJECT_REGION=br-se1
   MAGALU_OBJECT_PUBLIC_BASE=https://<host-do-bucket>
   ```
3. **Backend**
   ```bash
   npm install
   npm run dev   # porta 5000
   ```
4. **Frontend (Vite)**
   ```bash
   cd client
   npm install
   npm run dev   # porta 5173 com proxy /api
   ```

## Deploy automatizado (Magalu Cloud VM)

A pipeline `.github/workflows/deploy.yml` constrói e publica tudo via GitHub Actions sempre que houver push na `main` (ou manualmente via Workflow Dispatch). O processo é:

1. **Passos no runner**
   - Checkout
   - `npm ci` (backend)
   - `npm ci && npm run build` no `client`
2. **Passos na VM (via SSH)**
   - `git fetch/reset` para a branch disparada
   - `npm install` (backend e frontend)
   - `npm run build` no `client`
   - Reinício/boot do `pm2 start server/index.js --name fluency-api`
   - `sudo systemctl reload nginx`

### Pré-requisitos na VM
- Node 18 via `nvm`, `pm2` global, `git`, `nginx`, `mongod` (ou conexão com Atlas).
- Repositório já clonado em `${REMOTE_APP_DIR}` com `.env` preenchido e Nginx configurado para servir `client/dist` e fazer proxy para `http://127.0.0.1:5000/api`.
- Usuário SSH com acesso sem senha (chave) e permissão para `sudo systemctl reload nginx`.

### Secrets necessários no GitHub
| Secret            | Descrição                                         |
|-------------------|---------------------------------------------------|
| `SSH_HOST`        | IP ou domínio da VM                               |
| `SSH_USER`        | Usuário usado no SSH (ex.: `ubuntu`)               |
| `SSH_KEY`         | Chave privada (formato OpenSSH)                    |
| `SSH_PORT`        | (opcional) porta SSH, default `22`                 |
| `REMOTE_APP_DIR`  | Pasta do projeto na VM (ex.: `/var/www/fluency2work`) |

> **Dica:** mantenha um script de bootstrap na VM para instalar dependências, criar `.env` e configurar Nginx/PM2. Após isso, o workflow cuida dos próximos deploys automaticamente.

## Estrutura resumida

```
.
├─ package.json        # backend + scripts npm run dev/server
├─ server/             # Express, modelos Mongoose, upload Magalu
├─ client/             # SPA React (Vite)
└─ .github/workflows/  # pipeline de deploy
```
