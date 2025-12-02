# Fluency2Work · Guia de Deploy na Magalu Cloud
Este documento consolida todos os comandos e passos utilizados para subir o backend, frontend e MongoDB em uma VM da Magalu Cloud.

---
## 1. Preparação local
1. **Gerar chave SSH** (no computador local)  
   ```bash
   ssh-keygen -t ed25519 -C "fluency2work"
   ```  
   *Gera o par de chaves usado para acessar a VM e para o GitHub Actions.*

2. **Copiar a chave pública** e colar no portal da Magalu Cloud ao criar a VM.

---
## 2. Acesso à VM
1. **Conectar via SSH**  
   ```bash
   ssh -i ~/.ssh/fluency2work ubuntu@201.23.76.116
   ```  
   *Abre uma sessão na VM usando a chave cadastrada.*

---
## 3. Atualizar sistema e instalar dependências base
```bash
sudo apt update && sudo apt upgrade -y                 # atualiza pacotes
sudo apt install -y git build-essential nginx          # ferramentas básicas + Nginx
```

### Node.js + PM2 (via nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash   # instala nvm
source ~/.nvm/nvm.sh                                                              # carrega nvm na sessão
nvm install 20                                                                    # instala Node 20 LTS
nvm use 20
npm install -g pm2                                                                # gerenciador de processos Node
```

---
## 4. Clonar o repositório e configurar `.env`
```bash
sudo mkdir -p /var/www && sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/galvesb/en-course.git fluency2work
cd fluency2work
```

Criar o arquivo `.env` (na raiz do projeto):
```
PORT=5000
MONGO_URI=mongodb://admin:SUA_SENHA@127.0.0.1:27017/fluency?authSource=admin
JWT_SECRET=troque-por-uma-chave-forte
MAGALU_OBJECT_KEY_ID=...
MAGALU_OBJECT_KEY_SECRET=...
MAGALU_OBJECT_BUCKET=...
MAGALU_OBJECT_ENDPOINT=https://br-se1.magaluobjects.com
MAGALU_OBJECT_REGION=br-se1
MAGALU_OBJECT_PUBLIC_BASE=https://<host-do-bucket>
```

---
## 5. Instalar dependências do projeto
```bash
npm install                      # backend
cd client
npm install
npm run build                    # gera client/dist
cd ..
```
*O build do frontend precisa ser refeito após cada alteração relevante.*

---
## 6. Instalar e configurar MongoDB
1. **Adicionar repositório (exemplo Mongo 8)**  
   ```bash
   curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
   echo "deb [signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg arch=amd64,arm64] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
   sudo apt update
   sudo apt install -y mongodb-org
   ```
2. **Ajustar permissões e config**  
   ```bash
   sudo systemctl enable --now mongod             # inicia o serviço
   sudo nano /etc/mongod.conf                     # bindIp 0.0.0.0 e authorization habilitado
   ```
   ```
   net:
     port: 27017
     bindIp: 0.0.0.0
   security:
     authorization: enabled
   ```
3. **Criar usuário admin**  
   ```bash
   mongosh
   use admin
   db.createUser({ user: "admin", pwd: "SUA_SENHA", roles: [ { role: "root", db: "admin" } ] })
   exit
   ```
4. **Reiniciar e confirmar**  
   ```bash
   sudo systemctl restart mongod
   sudo lsof -iTCP -sTCP:LISTEN | grep 27017      # verifica se está ouvindo
   ```

---
## 7. Expor o Mongo para o Compass (opcional)
1. **Liberar porta no Security Group**: criar regra de Entrada TCP/27017 (origem IP específico ou 0.0.0.0/0).  
2. **Firewall local (se UFW ativo)**: `sudo ufw allow 27017/tcp`.
3. **Compass**: `mongodb://admin:SUA_SENHA@201.23.76.116:27017/fluency?authSource=admin`.

---
## 8. Configurar Nginx para servir o frontend e proxy do backend
Arquivo `/etc/nginx/sites-available/fluency.conf`:
```
server {
    listen 80;
    server_name 201.23.76.116;  # substitua por domínio se tiver

    root /var/www/fluency2work/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
Ativar e recarregar:
```bash
sudo ln -s /etc/nginx/sites-available/fluency.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---
## 9. Rodar o backend com PM2
```bash
pm2 start server/index.js --name fluency-api
pm2 save
pm2 startup systemd
```
Para aplicar novas variáveis/atualizações:
```bash
pm2 restart fluency-api --update-env
pm2 logs fluency-api --lines 100
```

---
## 10. Comandos úteis de monitoramento
```bash
sudo systemctl status mongod               # status do MongoDB
sudo tail -n 50 /var/log/mongodb/mongod.log
curl -i http://127.0.0.1:5000/api/test     # testa backend diretamente
pm2 status                                 # mostra processos Node
```

---
## 11. Workflow de deploy (manual ou GitHub Actions)
1. `git pull` na VM para trazer alterações.
2. `npm install` e `npm run build` no `client/`.
3. `pm2 restart fluency-api --update-env`.
4. `sudo systemctl reload nginx`.

### GitHub Actions
- Arquivo `.github/workflows/deploy.yml` faz o build e executa via SSH:  
  - Secrets necessários: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`, `REMOTE_APP_DIR`.
  - A pipeline usa `pm2 restart fluency-api` e `sudo systemctl reload nginx`.

---
## 12. Checklist final após cada deploy
- `pm2 status` → `fluency-api` online?
- `curl 127.0.0.1:5000/api/test` retorna 200?
- `sudo systemctl status mongod` → active?
- `sudo systemctl status nginx` → active?
- Navegador em `http://201.23.76.116/` (ou domínio) carrega app?

---
## 13. Monitoramento de recursos
```bash
neofetch                        # resumo visual de CPU/RAM/OS (apt install neofetch)
htop                            # monitor interativo de processos (apt install htop)
top                             # alternativa padrão ao htop
free -h                         # uso de memória (total/usado/livre)
df -h                           # uso de disco por partição
ps aux --sort=-%mem | head      # top processos por memória
pmap -x $(pgrep mongod)         # detalha consumo de memória do mongod
sudo lsof -iTCP -sTCP:LISTEN    # portas em escuta (Mongo, backend, etc.)
sudo journalctl -u mongod -n 50 # últimos logs do MongoDB
sudo journalctl -u nginx -n 50  # últimos logs do Nginx
pm2 logs fluency-api --lines 50 # logs do backend
```

Dentro do `mongosh`, confira memória específica do Mongo:
```javascript
db.serverStatus().mem
```

Com esse passo a passo você consegue reproduzir todo o fluxo de deploy na Magalu Cloud, monitorar recursos da VM e manter todo o stack (frontend, backend e MongoDB) saudável.

