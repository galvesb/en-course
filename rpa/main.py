from playwright.sync_api import sync_playwright, expect
import time 
import os

# ====================================================================
#                          CONFIGURAÇÕES
# ====================================================================

# --- Configurações Site 1 (Sua Aplicação) ---
URL_LOGIN_SITE1 = os.environ.get("SITE1_LOGIN_URL", "http://localhost:5173/login")
URL_PROFESSION_ESPERADA = os.environ.get("SITE1_PROFESSION_URL", "http://localhost:5173/profession")
URL_HOME_ESPERADO = os.environ.get("SITE1_HOME_URL", "http://localhost:5173/")
URL_ADMIN_ESPERADA = os.environ.get("SITE1_ADMIN_URL", "http://localhost:5173/admin")
PROFISSAO_PADRAO = os.environ.get("SITE1_PROFESSION_NAME", "Software Developer")
EMAIL = "admin@admin.com"
SENHA = "123456"

# --- Configurações Site 2 (ElevenLabs) ---
URL_ELEVENLABS_HOME = "https://elevenlabs.io/app/home" 
URL_ELEVENLABS_TTS = "https://elevenlabs.io/app/speech-synthesis/text-to-speech" 
ELEVENLABS_EMAIL = os.environ.get("ELEVENLABS_EMAIL", "guilherme.gommezz@gmail.com")
ELEVENLABS_PASSWORD = os.environ.get("ELEVENLABS_PASSWORD", "Patiro@01")

# --- Seletores ---
SELECTOR_TEXT_INPUT = 'textarea[data-testid="tts-editor"]' 
SELECTOR_GENERATE_BUTTON = 'button[data-testid="tts-generate"]'
SELECTOR_DOWNLOAD_BUTTON = 'button[data-testid="audio-player-download-button"]'
SELECTOR_COURSE_DAYS_BUTTON = 'button:has-text("Course / Days Management")'
SELECTOR_PROFESSION_DROPDOWN = 'select:has(option[value="developer"])'
SELECTOR_CATEGORY_DROPDOWN = 'select:has(option[value="conversation"])'
SELECTOR_PERSON_DROPDOWN = 'select[style*="flex: 0 0 90px"]' 
SELECTOR_TOPIC_DROPDOWN = 'select[style*="flex: 1 1 140px"]'
SELECTOR_PALAVRAS_DROPDOWN = 'select[style*="flex: 2 1 220px"]' 
SELECTOR_DAYS_CONTAINER = 'div[style*="max-height: 250px; overflow-y: auto"]'
SELECTOR_AUDIO_INPUT = 'input[accept="audio/*"][type="file"]'
SELECTOR_ENVIAR_AUDIO_BUTTON = 'button:has-text("Enviar Áudio")'
SELECTOR_SALVAR_DIA_BUTTON = 'button:has-text("Salvar Dia")'


# ====================================================================
#                            FUNÇÕES AUXILIARES
# ====================================================================

def garantir_login_elevenlabs(page, context, storage_file):
    """Garante login no ElevenLabs."""
    login_email_selector = 'input[name="email"], input[type="email"]'
    login_password_selector = 'input[name="password"], input[type="password"]'
    login_button_selector = 'button:has-text("Sign in"), button:has-text("Log in"), button[type="submit"]'

    precisa_login = page.locator(login_email_selector).count() > 0
    if not precisa_login:
        return

    print("🔐 Fazendo login automático no ElevenLabs...")
    page.locator(login_email_selector).first.fill(ELEVENLABS_EMAIL)
    page.locator(login_password_selector).first.fill(ELEVENLABS_PASSWORD)

    login_button = page.locator(login_button_selector).first
    expect(login_button).to_be_enabled(timeout=15000)
    login_button.click()
    page.wait_for_timeout(2000)

    try:
        context.storage_state(path=storage_file)
        print(f"✅ Login realizado e estado salvo em {storage_file}")
    except Exception as e:
        print(f"⚠️ Não foi possível salvar o storage state: {e}")

def selecionar_opcao_dinamica(page, selector, nome_interacao, pre_selecao=None, filtrar_vazios=True):
    """
    Lista opções de um dropdown. 
    - Se 'pre_selecao' for fornecido (valor), seleciona direto.
    - Se não, pergunta ao usuário.
    Retorna o dicionário da opção escolhida {id, value, nome}.
    """
    opcoes_locator = page.locator(f'{selector} >> option')
    todas_opcoes = opcoes_locator.evaluate_all("(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome: option.textContent.trim() }))")
    
    if filtrar_vazios:
        lista_opcoes = [o for o in todas_opcoes if o['value'] != '']
    else:
        lista_opcoes = todas_opcoes

    # Se já temos uma escolha definida (Automação), busca na lista
    if pre_selecao:
        opcao_encontrada = next((o for o in lista_opcoes if o['value'] == pre_selecao), None)
        if opcao_encontrada:
            page.select_option(selector, value=pre_selecao)
            print(f"🤖 (Auto) {nome_interacao}: '{opcao_encontrada['nome']}' selecionado.")
            page.wait_for_timeout(500)
            return opcao_encontrada
        else:
            print(f"⚠️ Valor pré-selecionado '{pre_selecao}' não encontrado para {nome_interacao}. Caindo para manual.")

    # Modo Manual (Pergunta ao usuário)
    print("\n" + "="*40)
    print(f"❓ Escolha: {nome_interacao}")
    for item in lista_opcoes:
        print(f"[{item['id']}] - {item['nome']}")
    print("="*40)

    escolha = None
    ids_validos = [str(i['id']) for i in lista_opcoes]
    while escolha not in ids_validos:
        escolha = input(f"Digite o número para {nome_interacao}: ")
    
    item_escolhido = next(i for i in lista_opcoes if str(i['id']) == escolha)
    page.select_option(selector, value=item_escolhido['value'])
    print(f"✅ {nome_interacao}: '{item_escolhido['nome']}' selecionado.")
    page.wait_for_timeout(500)
    return item_escolhido

def fazer_login_e_preparar_site1(page):
    """Realiza o login inicial e abre o painel Admin."""
    print(f"🌐 Navegando para o login do Site 1: {URL_LOGIN_SITE1}")
    page.goto(URL_LOGIN_SITE1)
    
    # Verifica se já não estamos logados
    if page.url != URL_HOME_ESPERADO and page.url != URL_ADMIN_ESPERADA:
        if page.locator('input[type="email"]').count() > 0:
            page.locator('input[type="email"]').fill(EMAIL)
            page.locator('input[type="password"]').fill(SENHA)
            page.locator('button.auth-submit').click()
            page.wait_for_url(URL_PROFESSION_ESPERADA)
    
    # Seleciona profissão se necessário
    if "profession" in page.url:
        print(f"🔎 Selecionando profissão padrão: {PROFISSAO_PADRAO}")
        page.locator(f'.profession-card-item:has-text("{PROFISSAO_PADRAO}")').first.click()
        page.wait_for_url(URL_HOME_ESPERADO)

    # Vai para Admin
    page.goto(URL_ADMIN_ESPERADA)
    
    # Abre o painel se estiver fechado
    btn_painel = page.locator(SELECTOR_COURSE_DAYS_BUTTON)
    if btn_painel.is_visible():
        btn_painel.click()
        
    page.wait_for_selector(SELECTOR_PROFESSION_DROPDOWN)
    print("✅ Painel Admin pronto.")

def obter_frases_disponiveis(page):
    """Retorna a lista de frases baseada nos filtros atuais."""
    opcoes_locator = page.locator(f'{SELECTOR_PALAVRAS_DROPDOWN} >> option')
    lista = opcoes_locator.evaluate_all("""(options) => options.map((option) => ({ value: option.value, nome_completo: option.textContent.trim() }))""")
    validas = [opt for opt in lista if opt['value'] != '']
    
    for i, opt in enumerate(validas):
        frase = opt['nome_completo']
        validas[i]['mensagem_limpa'] = frase.split(' - ', 1)[1].strip() if ' - ' in frase else frase.strip()
    
    return validas

# ====================================================================
#                      FUNÇÃO DE PROCESSAMENTO (CORE)
# ====================================================================

def processar_frase_e_upload(page_admin, context, frase_data, indice, total, storage_file):
    """Gera áudio no ElevenLabs e faz upload no Site 1."""
    mensagem = frase_data['mensagem_limpa']
    frase_value = frase_data['value']
    
    print(f"\n🔄 Processando Frase {indice}/{total}: {mensagem}")

    page_eleven = context.new_page()
    try:
        # 1. ElevenLabs
        page_eleven.goto(URL_ELEVENLABS_HOME)
        garantir_login_elevenlabs(page_eleven, context, storage_file)
        page_eleven.goto(URL_ELEVENLABS_TTS)

        txt_area = page_eleven.locator(SELECTOR_TEXT_INPUT)
        txt_area.wait_for(state="visible", timeout=15000)
        txt_area.fill(mensagem)
        
        btn_gen = page_eleven.locator(SELECTOR_GENERATE_BUTTON)
        expect(btn_gen).to_be_enabled(timeout=15000)
        btn_gen.click()

        if not os.path.exists("downloads"): os.makedirs("downloads")

        with page_eleven.expect_download(timeout=60000) as download_info:
            btn_down = page_eleven.locator(SELECTOR_DOWNLOAD_BUTTON)
            btn_down.wait_for(state="visible", timeout=60000)
            btn_down.click()

        download = download_info.value
        path = os.path.join("downloads", download.suggested_filename)
        download.save_as(path)
        print(f"✅ Áudio baixado: {path}")
        page_eleven.close()

        # 2. Upload no Admin
        # Garante que o painel está aberto e a frase selecionada
        if page_admin.locator(SELECTOR_COURSE_DAYS_BUTTON).is_visible():
            page_admin.locator(SELECTOR_COURSE_DAYS_BUTTON).click()
            page_admin.wait_for_selector(SELECTOR_PROFESSION_DROPDOWN)

        page_admin.select_option(SELECTOR_PALAVRAS_DROPDOWN, value=frase_value)
        page_admin.wait_for_timeout(500)

        page_admin.locator(SELECTOR_AUDIO_INPUT).set_input_files(path)
        page_admin.wait_for_timeout(2000)
        
        page_admin.locator(SELECTOR_ENVIAR_AUDIO_BUTTON).click()
        page_admin.locator(SELECTOR_SALVAR_DIA_BUTTON).click()
        
        # Espera o painel "piscar" (fechar/abrir ou processar)
        page_admin.locator(SELECTOR_COURSE_DAYS_BUTTON).wait_for(state="visible", timeout=30000)
        print("✅ Áudio enviado e dia salvo.")

    except Exception as e:
        print(f"❌ Erro na frase '{mensagem}': {e}")
        if not page_eleven.is_closed(): page_eleven.close()

# ====================================================================
#                            MAIN
# ====================================================================

def main():
    if not os.path.exists("downloads"): os.makedirs("downloads")
    storage_file = 'elevenlabs_auth.json'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=200)
        context = browser.new_context(storage_state=storage_file) if os.path.exists(storage_file) else browser.new_context()
        page_admin = context.new_page()

        # 1. Login Inicial
        fazer_login_e_preparar_site1(page_admin)

        # 2. Pergunta sobre o Fluxo
        print("\n" + "⭐"*50)
        modo = input("Deseja rodar para um CENÁRIO INTEIRO (automático)? (s/n): ").strip().lower()
        print("⭐"*50)

        tasks_to_run = [] # Lista de configurações para rodar

        if modo == 's':
            # --- CONFIGURAÇÃO DO CENÁRIO INTEIRO ---
            
            # 1. Profissão (Geralmente é fixa, mas vamos garantir selecionando a padrão/primeira ou perguntando uma vez)
            # Para simplificar, usamos a função helper sem valor pre-definido, o usuário escolhe uma vez.
            prof_data = selecionar_opcao_dinamica(page_admin, SELECTOR_PROFESSION_DROPDOWN, "Profissão")
            
            # 2. Dia (Pergunta uma vez)
            print("\n📅 Selecione o DIA para o cenário inteiro:")
            # Lógica específica para clicar na div do dia
            day_nodes = page_admin.locator(f'{SELECTOR_DAYS_CONTAINER} > div')
            lista_dias = day_nodes.evaluate_all("(nodes) => nodes.map((n, i) => ({ id: i+1, nome: n.textContent.trim() }))")
            for d in lista_dias: print(f"[{d['id']}] - {d['nome']}")
            escolha_dia = input("Digite o número do Dia: ")
            dia_idx = int(escolha_dia) - 1
            # Clica no dia
            page_admin.locator(f'{SELECTOR_DAYS_CONTAINER} > div:nth-child({dia_idx + 1})').click()
            print(f"✅ Dia '{lista_dias[dia_idx]['nome']}' definido.")
            page_admin.wait_for_timeout(500)

            # 3. Tópico/Cenário (Pergunta uma vez)
            print("\n🎬 Selecione o CENÁRIO (Tópico) para rodar:")
            topic_data = selecionar_opcao_dinamica(page_admin, SELECTOR_TOPIC_DROPDOWN, "Cenário/Tópico")

            # 4. Identificar Pessoas (A e B)
            print("\n👥 Precisamos identificar quem é a Pessoa A e a Pessoa B.")
            p_opts = page_admin.locator(f'{SELECTOR_PERSON_DROPDOWN} >> option').evaluate_all("(opts) => opts.map(o => ({val: o.value, txt: o.textContent}))")
            p_opts = [x for x in p_opts if x['val'] != '']
            
            for i, p_opt in enumerate(p_opts): print(f"[{i+1}] {p_opt['txt']}")
            idx_a = int(input("Quem é a Pessoa A? (número): ")) - 1
            idx_b = int(input("Quem é a Pessoa B? (número): ")) - 1
            
            pessoa_a_val = p_opts[idx_a]['val']
            pessoa_b_val = p_opts[idx_b]['val']
            
            # Identificar Categorias (Words e Conversation)
            # Tentativa de achar automático, senão pergunta
            c_opts = page_admin.locator(f'{SELECTOR_CATEGORY_DROPDOWN} >> option').evaluate_all("(opts) => opts.map(o => ({val: o.value, txt: o.textContent.toLowerCase()}))")
            cat_words = next((c['val'] for c in c_opts if 'words' in c['txt'] or 'palavras' in c['txt']), None)
            cat_conv = next((c['val'] for c in c_opts if 'conversation' in c['txt'] or 'conversação' in c['txt']), None)
            
            if not cat_words or not cat_conv:
                print("⚠️ Não foi possível detectar Words/Conversation automaticamente. Selecione:")
                for i, c_opt in enumerate(c_opts): print(f"[{i+1}] {c_opt['txt']}")
                cat_words = c_opts[int(input("Words: "))-1]['val']
                cat_conv = c_opts[int(input("Conversation: "))-1]['val']

            # Monta a fila de execução na ordem solicitada:
            # Pessoa A -> Words, Pessoa A -> Conv, Pessoa B -> Words, Pessoa B -> Conv
            tasks_to_run = [
                {'p': pessoa_a_val, 'c': cat_words, 'desc': f"Pessoa A ({p_opts[idx_a]['txt']}) - Words"},
                {'p': pessoa_a_val, 'c': cat_conv,  'desc': f"Pessoa A ({p_opts[idx_a]['txt']}) - Conversation"},
                {'p': pessoa_b_val, 'c': cat_words, 'desc': f"Pessoa B ({p_opts[idx_b]['txt']}) - Words"},
                {'p': pessoa_b_val, 'c': cat_conv,  'desc': f"Pessoa B ({p_opts[idx_b]['txt']}) - Conversation"},
            ]
            
            # Valores fixos para o loop
            config_global = {
                'prof': prof_data['value'],
                'topic': topic_data['value'],
                'dia_click_selector': f'{SELECTOR_DAYS_CONTAINER} > div:nth-child({dia_idx + 1})'
            }

        else:
            # --- MODO MANUAL (UMA RODADA SÓ) ---
            print("🖐️ Modo Manual Selecionado.")
            # Pergunta tudo manualmente e gera uma única task
            prof = selecionar_opcao_dinamica(page_admin, SELECTOR_PROFESSION_DROPDOWN, "Profissão")
            
            # Dia manual
            day_nodes = page_admin.locator(f'{SELECTOR_DAYS_CONTAINER} > div')
            lista_dias = day_nodes.evaluate_all("(nodes) => nodes.map((n, i) => ({ id: i+1, nome: n.textContent.trim() }))")
            for d in lista_dias: print(f"[{d['id']}] - {d['nome']}")
            escolha_dia = input("Digite o número do Dia: ")
            dia_sel = f'{SELECTOR_DAYS_CONTAINER} > div:nth-child({escolha_dia})'
            page_admin.locator(dia_sel).click()
            
            cat = selecionar_opcao_dinamica(page_admin, SELECTOR_CATEGORY_DROPDOWN, "Categoria")
            pers = selecionar_opcao_dinamica(page_admin, SELECTOR_PERSON_DROPDOWN, "Pessoa")
            top = selecionar_opcao_dinamica(page_admin, SELECTOR_TOPIC_DROPDOWN, "Tópico")
            
            tasks_to_run = [{
                'p': pers['value'], 
                'c': cat['value'], 
                'desc': "Seleção Manual Única"
            }]
            config_global = {'prof': prof['value'], 'topic': top['value'], 'dia_click_selector': dia_sel}

        # ====================================================================
        #                   EXECUÇÃO DO LOOP (AUTOMÁTICO OU MANUAL)
        # ====================================================================
        
        for task in tasks_to_run:
            print(f"\n🚀 Iniciando bloco: {task['desc']}")
            
            # 1. Reaplica as configurações na página para garantir o estado
            # Profissao
            page_admin.select_option(SELECTOR_PROFESSION_DROPDOWN, value=config_global['prof'])
            page_admin.wait_for_timeout(300)
            
            # Dia (Clica novamente para garantir)
            page_admin.locator(config_global['dia_click_selector']).click()
            page_admin.wait_for_timeout(300)
            
            # Categoria (Da Task)
            page_admin.select_option(SELECTOR_CATEGORY_DROPDOWN, value=task['c'])
            page_admin.wait_for_timeout(300)

            # Pessoa (Da Task)
            page_admin.select_option(SELECTOR_PERSON_DROPDOWN, value=task['p'])
            page_admin.wait_for_timeout(300)
            
            # Tópico (Global)
            page_admin.select_option(SELECTOR_TOPIC_DROPDOWN, value=config_global['topic'])
            page_admin.wait_for_timeout(1000) # Espera carregar frases
            
            # 2. Coleta Frases
            frases = obter_frases_disponiveis(page_admin)
            
            if not frases:
                print(f"⚠️ Nenhuma frase encontrada para {task['desc']}. Pulando...")
                continue
            
            print(f"📄 Encontradas {len(frases)} frases para processar.")
            
            # 3. Processa cada frase
            for i, f in enumerate(frases):
                processar_frase_e_upload(page_admin, context, f, i+1, len(frases), storage_file)
                context.storage_state(path=storage_file)

        print("\n🏁 Automação finalizada com sucesso!")
        time.sleep(3)
        browser.close()

if __name__ == "__main__":
    main()