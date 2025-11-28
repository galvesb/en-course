# Guia de Troubleshooting - Backend

## Problemas Comuns e Soluções

### 1. Erro ao iniciar o servidor

**Sintomas:** O servidor não inicia ou mostra erros

**Soluções:**
- Verifique se todas as dependências estão instaladas:
  ```bash
  npm install
  ```

- Verifique se o MongoDB está rodando:
  ```bash
  # Windows (PowerShell)
  Get-Service MongoDB
  
  # Ou tente iniciar manualmente
  mongod
  ```

- Verifique se a porta 5000 está livre:
  ```bash
  netstat -ano | findstr :5000
  ```

### 2. Erro de conexão com MongoDB

**Sintomas:** "MongoDB connection error" no console

**Soluções:**
- Certifique-se de que o MongoDB está instalado e rodando
- Verifique se o MongoDB está na porta padrão (27017)
- Se estiver usando MongoDB Atlas ou outra instância remota, atualize a string de conexão em `server/index.js`

### 3. Erro 500 no registro de usuário

**Sintomas:** Erro 500 ao tentar registrar um novo usuário

**Soluções:**
- Verifique os logs do servidor para ver o erro específico
- Certifique-se de que o MongoDB está conectado
- Verifique se os campos obrigatórios estão sendo enviados
- Verifique se não há usuário duplicado (mesmo email ou CPF)

### 4. Dependências não encontradas

**Sintomas:** "Cannot find module" ou erros similares

**Soluções:**
```bash
# Instale as dependências
npm install

# Se ainda houver problemas, limpe e reinstale
rm -rf node_modules package-lock.json
npm install
```

## Como Rodar o Servidor

### Opção 1: Usando o script npm
```bash
npm run server
```

### Opção 2: Diretamente com Node
```bash
node server/index.js
```

### Opção 3: Com nodemon (se instalado)
```bash
npx nodemon server/index.js
```

## Verificação de Saúde do Servidor

Após iniciar o servidor, você deve ver:
- "Loading auth routes..."
- "authRoutes type: object"
- "Auth routes mounted at /api/auth"
- "MongoDB connected successfully" (se MongoDB estiver rodando)
- "Server running on port 5000"

## Testando o Servidor

Após iniciar, teste os endpoints:

1. **Listar cursos:**
   ```bash
   curl http://localhost:5000/api/courses
   ```

2. **Registrar usuário:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Teste","email":"teste@teste.com","cpf":"12345678901","address":"Rua Teste","password":"123456"}'
   ```

## Logs e Debug

O servidor agora tem logs mais detalhados:
- Erros de MongoDB são exibidos no console
- Erros de registro mostram mensagens específicas
- Em modo desenvolvimento, erros completos são exibidos

