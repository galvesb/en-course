from playwright.sync_api import sync_playwright, expect
import time 
import os

# ====================================================================
#                          CONFIGURAÇÕES
# ====================================================================

# --- Configurações Site 1 (Sua Aplicação) ---
URL_LOGIN_SITE1 = "http://localhost:5173/login"
URL_PROFESSION_ESPERADA = "http://localhost:5173/profession" 
URL_ADMIN_ESPERADA = "http://localhost:5173/admin"
EMAIL = "admin@admin.com"
SENHA = "123456"

# --- Configurações Site 2 (ElevenLabs) ---
URL_ELEVENLABS_HOME = "https://elevenlabs.io/app/home" 
URL_ELEVENLABS_TTS = "https://elevenlabs.io/app/speech-synthesis/text-to-speech" 

SELECTOR_TEXT_INPUT = 'textarea[data-testid="tts-editor"]' 
SELECTOR_GENERATE_BUTTON = 'button[data-testid="tts-generate"]'
SELECTOR_DOWNLOAD_BUTTON = 'button[data-testid="audio-player-download-button"]'

# Seletor para reabrir o painel de gerenciamento
SELECTOR_COURSE_DAYS_BUTTON = 'button:has-text("Course / Days Management")'

# Seletores dos Dropdowns (mantidos por garantia, mesmo que o estado seja preservado)
SELECTOR_PROFESSION_DROPDOWN = 'select:has(option[value="developer"])'
SELECTOR_CATEGORY_DROPDOWN = 'select:has(option[value="conversation"])'
SELECTOR_PERSON_DROPDOWN = 'select[style*="flex: 0 0 90px"]' 
SELECTOR_TOPIC_DROPDOWN = 'select[style*="flex: 1 1 140px"]'
SELECTOR_PALAVRAS_DROPDOWN = 'select[style*="flex: 2 1 220px"]' 
SELECTOR_DAYS_CONTAINER = 'div[style*="max-height: 250px; overflow-y: auto"]'

# Campo de Input de Arquivo
SELECTOR_AUDIO_INPUT = 'input[accept="audio/*"][type="file"]'

# Botões de Ação Final
SELECTOR_ENVIAR_AUDIO_BUTTON = 'button:has-text("Enviar Áudio")'
SELECTOR_SALVAR_DIA_BUTTON = 'button:has-text("Salvar Dia")'


# ====================================================================
#                           FUNÇÕES DE AUTOMAÇÃO
# ====================================================================

def automatizar_site_1_interativo(page):
    """
    Executa a automação interativa do Site 1 (login, navegação, e seleção inicial).
    Retorna o dicionário de seleções e a lista de frases.
    """
    selecoes_salvas = {}
    
    print(f"🌐 1. Navegando para o login do Site 1: {URL_LOGIN_SITE1}")
    page.goto(URL_LOGIN_SITE1)
    
    page.locator('input[type="email"]').fill(EMAIL)
    page.locator('input[type="password"]').fill(SENHA)
    page.locator('.btn.primary:has-text("Login")').click()
    page.wait_for_url(URL_PROFESSION_ESPERADA)
    print("✅ Login do Site 1 concluído.")
    
    # Navegação inicial para o Admin e abertura do painel
    page.locator('.day-node:has-text("Software Developer")').click()
    page.goto(URL_ADMIN_ESPERADA)
    page.locator(SELECTOR_COURSE_DAYS_BUTTON).click()
    print("✅ 3. Navegação inicial para 'Course / Days Management' concluída.")
    page.wait_for_selector(SELECTOR_PROFESSION_DROPDOWN)
    
    # --- Interação 1: Profissão ---
    opcoes_locator_prof = page.locator(f'{SELECTOR_PROFESSION_DROPDOWN} >> option[value]:not([value=""])')
    lista_profissoes = opcoes_locator_prof.evaluate_all("(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome: option.textContent.trim() }))")
    print("\n" + "="*40); print("❓ Interação 1: Escolha a Profissão:")
    for prof in lista_profissoes: print(f"[{prof['id']}] - {prof['nome']}")
    print("="*40)
    escolha_usuario_prof = None
    ids_validos_prof = [str(p['id']) for p in lista_profissoes]
    while escolha_usuario_prof not in ids_validos_prof: escolha_usuario_prof = input("Digite o número da Profissão e pressione Enter: ")
    profissao_escolhida = next(p for p in lista_profissoes if str(p['id']) == escolha_usuario_prof)
    page.select_option(SELECTOR_PROFESSION_DROPDOWN, value=profissao_escolhida['value'])
    selecoes_salvas['profissao'] = profissao_escolhida['value']
    print(f"\n✅ 4. Profissão '{profissao_escolhida['nome']}' selecionada.")
    page.wait_for_timeout(500) 
    
    # --- Interação 2: Dia ---
    day_nodes_locator = page.locator(f'{SELECTOR_DAYS_CONTAINER} > div')
    lista_dias = day_nodes_locator.evaluate_all("""(nodes, container_selector) => nodes.map((node, index) => ({ id: index + 1, nome: node.textContent.trim().replace(/\s+/g, ' '), seletor: `${container_selector} > div:nth-child(${index + 1})` }))""", SELECTOR_DAYS_CONTAINER) 
    if not lista_dias:
        print("⚠️ Aviso: Não foram encontrados dias para selecionar. Continuando...")
        selecoes_salvas['dia_nome'] = None
    else:
        print("\n" + "="*40); print("❓ Interação 2: Escolha o Dia:")
        for dia in lista_dias: print(f"[{dia['id']}] - {dia['nome']}")
        print("="*40)
        escolha_dia = None
        ids_validos_dias = [str(d['id']) for d in lista_dias]
        while escolha_dia not in ids_validos_dias: escolha_dia = input("Digite o número do Dia e pressione Enter: ")
        dia_escolhido = next(d for d in lista_dias if str(d['id']) == escolha_dia)
        page.locator(dia_escolhido['seletor']).click()
        selecoes_salvas['dia_nome'] = dia_escolhido['nome'].replace(' ', '')
        print(f"\n✅ 5. Clicado no '{dia_escolhido['nome']}'.")
        page.wait_for_timeout(500) 
    
    # --- Interação 3: Categoria ---
    opcoes_locator_cat = page.locator(f'{SELECTOR_CATEGORY_DROPDOWN} >> option')
    lista_categorias = [c for c in opcoes_locator_cat.evaluate_all("(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome: option.textContent.trim() }))") if c['value'] != '']
    print("\n" + "="*40); print("❓ Interação 3: Escolha a Categoria:")
    for cat in lista_categorias: print(f"[{cat['id']}] - {cat['nome']}")
    print("="*40)
    escolha_cat = None
    ids_validos_cat = [str(c['id']) for c in lista_categorias]
    while escolha_cat not in ids_validos_cat: escolha_cat = input("Digite o número da Categoria e pressione Enter: ")
    categoria_escolhida = next(c for c in lista_categorias if str(c['id']) == escolha_cat)
    page.select_option(SELECTOR_CATEGORY_DROPDOWN, value=categoria_escolhida['value'])
    selecoes_salvas['categoria'] = categoria_escolhida['value']
    print(f"✅ 6. Categoria '{categoria_escolhida['nome']}' selecionada.")
    page.wait_for_timeout(500) 

    # --- Interação 4: Pessoa (A ou B) ---
    opcoes_locator_person = page.locator(f'{SELECTOR_PERSON_DROPDOWN} >> option')
    lista_pessoas = [p for p in opcoes_locator_person.evaluate_all("(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome: option.textContent.trim() }))") if p['value'] != '']
    print("\n" + "="*40); print("❓ Interação 4: Escolha a Pessoa (A ou B):")
    for person in lista_pessoas: print(f"[{person['id']}] - {person['nome']}")
    print("="*40)
    escolha_person = None
    ids_validos_person = [str(p['id']) for p in lista_pessoas]
    while escolha_person not in ids_validos_person: escolha_person = input("Digite o número da Pessoa e pressione Enter: ")
    pessoa_escolhida = next(p for p in lista_pessoas if str(p['id']) == escolha_person)
    page.select_option(SELECTOR_PERSON_DROPDOWN, value=pessoa_escolhida['value'])
    selecoes_salvas['pessoa'] = pessoa_escolhida['value']
    print(f"✅ 7. Pessoa '{pessoa_escolhida['nome']}' selecionada.")
    page.wait_for_timeout(500) 
    
    # --- Interação 5: Tópico/Tema ---
    opcoes_locator_topic = page.locator(f'{SELECTOR_TOPIC_DROPDOWN} >> option')
    lista_topicos = [t for t in opcoes_locator_topic.evaluate_all("(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome: option.textContent.trim() }))") if t['value'] != '']
    print("\n" + "="*40); print("❓ Interação 5: Escolha o Tópico/Tema:")
    for topico in lista_topicos: print(f"[{topico['id']}] - {topico['nome']}")
    print("="*40)
    escolha_topico = None
    ids_validos_topico = [str(t['id']) for t in lista_topicos]
    while escolha_topico not in ids_validos_topico: escolha_topico = input("Digite o número do Tópico e pressione Enter: ")
    topico_escolhido = next(t for t in lista_topicos if str(t['id']) == escolha_topico)
    page.select_option(SELECTOR_TOPIC_DROPDOWN, value=topico_escolhido['value'])
    selecoes_salvas['topico'] = topico_escolhido['value']
    print(f"✅ 8. Tópico '{topico_escolhido['nome']}' selecionado.")
    page.wait_for_timeout(500) 

    # --- Coleta Final: Lista de Frases Disponíveis ---
    opcoes_locator_palavras = page.locator(f'{SELECTOR_PALAVRAS_DROPDOWN} >> option')
    lista_opcoes_frase = opcoes_locator_palavras.evaluate_all("""(options) => options.map((option, index) => ({ id: index + 1, value: option.value, nome_completo: option.textContent.trim() }))""")
    opcoes_validas = [opt for opt in lista_opcoes_frase if opt['value'] != '']
    
    for i, opt in enumerate(opcoes_validas):
        frase_completa = opt['nome_completo']
        mensagem_limpa = frase_completa.split(' - ', 1)[1].strip() if ' - ' in frase_completa else frase_completa.strip()
        opcoes_validas[i]['mensagem_limpa'] = mensagem_limpa

    print("\n✅ 9. Coleta de todas as frases disponíveis concluída.")
    
    return selecoes_salvas, opcoes_validas

def processar_frase_e_upload(page_admin, context, selecoes_admin, frase_data, indice_frase, total_frases, storage_file):
    """
    Processa uma única frase usando uma ABA SEPARADA para o ElevenLabs.
    Se ocorrer erro no ElevenLabs, pula para a próxima frase.
    """
    mensagem = frase_data['mensagem_limpa']
    frase_value = frase_data['value']
    
    print("\n" + "="*80)
    print(f"🔄 Processando Frase {indice_frase} de {total_frases}: {mensagem}")
    print("="*80)

    # 1. Navegar para ElevenLabs (Nova Aba) e Gerar/Baixar
    
    print(f"🎧 10. Criando nova aba para ElevenLabs...")
    page_elevenlabs = context.new_page() 
    
    print(f"🎧 11. Navegando para o ElevenLabs: {URL_ELEVENLABS_HOME}")
    page_elevenlabs.goto(URL_ELEVENLABS_HOME)
    
    if not os.path.exists(storage_file):
        print("\n" + "#"*70)
        print("🚨 AÇÃO NECESSÁRIA: LOGIN MANUAL NO ELEVENLABS 🚨")
        input("Pressione Enter para continuar a automação após o login...")
        page_elevenlabs.wait_for_timeout(1000)
        context.storage_state(path=storage_file) 
        print(f"✅ Estado de login do ElevenLabs salvo em: {storage_file}")
    
    # Inicia o bloco TRY para capturar erros durante a geração/download do áudio
    try:
        print(f"🎧 12. Navegando para a página de Text-to-Speech: {URL_ELEVENLABS_TTS}")
        page_elevenlabs.goto(URL_ELEVENLABS_TTS)

        print("🎧 13. Colando a mensagem no campo de texto (textarea).")
        text_input_locator = page_elevenlabs.locator(SELECTOR_TEXT_INPUT)
        text_input_locator.wait_for(state="visible", timeout=15000) 
        
        text_input_locator.fill("") 
        text_input_locator.fill(mensagem)
        
        page_elevenlabs.wait_for_timeout(1000)
        
        generate_button = page_elevenlabs.locator(SELECTOR_GENERATE_BUTTON)
        print("🎧 14.1. Esperando o botão 'Generate speech' ficar habilitado...")
        expect(generate_button).to_be_enabled(timeout=15000) 
        
        print("🎧 14.2. Clicando em 'Generate speech'.")
        generate_button.click()
        
        if not os.path.exists("downloads"):
            os.makedirs("downloads")

        # -----------------------------------------------------
        # 🎧 15. Clicar no botão 'Download' 
        # -----------------------------------------------------
        print("🎧 15. Tentando baixar o áudio do ElevenLabs...")

        # Aumentamos o timeout de download para 60s
        with page_elevenlabs.expect_download(timeout=60000) as download_info:
            download_button = page_elevenlabs.locator(SELECTOR_DOWNLOAD_BUTTON)
            # Aumenta o timeout para o botão aparecer
            download_button.wait_for(state="visible", timeout=60000) 
            download_button.click()

        download = download_info.value
        file_name = download.suggested_filename
        download_path = os.path.join("downloads", file_name)
        download.save_as(download_path)
        print(f"✅ Download concluído! Arquivo salvo em: {download_path}")
        
    except Exception as e:
        print("\n" + "❌"*20)
        print(f"❌ ERRO CRÍTICO NO PROCESSAMENTO DA FRASE {indice_frase}: {mensagem}")
        print(f"Detalhe do erro: {e}")
        print("❌ PULANDO PARA A PRÓXIMA FRASE.")
        print("❌"*20 + "\n")
        # Fecha a aba com erro e retorna para o loop principal
        page_elevenlabs.close() 
        return # <-- Sai da função e evita que o restante do código seja executado
    finally:
        # Garante que a aba do ElevenLabs seja fechada, mesmo em caso de erro.
        # No bloco 'except', já chamamos close(), mas o finally garante que seja fechada
        # se o erro ocorreu antes do download, mas depois da abertura da página.
        if page_elevenlabs:
             # Se a página ainda estiver aberta (o bloco except só a fecha se for capturado)
             # Neste caso, a aba é fechada no 'except' ou depois do download (sucesso).
             pass # Mantemos a lógica de fechar logo após o sucesso/falha abaixo.


    # Fechar a aba do ElevenLabs
    print("❌ 16. Fechando a aba do ElevenLabs e focando no Admin (estado preservado).")
    page_elevenlabs.close()

    # 2. Upload do Áudio (Usando page_admin)
    
    course_days_button_locator = page_admin.locator(SELECTOR_COURSE_DAYS_BUTTON)
    
    # Se o painel estiver fechado, precisamos abri-lo antes de tentar selecionar a frase
    if course_days_button_locator.is_visible():
        print("   -> Painel 'Course / Days Management' estava fechado. Reabrindo...")
        course_days_button_locator.click()
        # Espera o dropdown de profissão aparecer para confirmar que o painel abriu
        page_admin.locator(SELECTOR_PROFESSION_DROPDOWN).wait_for(state="visible", timeout=10000)
    else:
        print("   -> Painel Admin já estava aberto. Continuando...")
    
    print("⚙️ 17. Re-seleção da Frase e Upload do Áudio:")

    # 1. Reaplica a Frase atual (IMPORTANTE!)
    frase_locator = page_admin.locator(f'{SELECTOR_PALAVRAS_DROPDOWN} option[value="{frase_value}"]')
    page_admin.select_option(SELECTOR_PALAVRAS_DROPDOWN, value=frase_value)
    
    print(f"   -> Frase atual ({frase_value}) re-selecionada. Os filtros anteriores foram preservados.")
    page_admin.wait_for_timeout(500) 
    
    # Upload do Áudio
    print(f"\n⬆️ 18. Fazendo upload do arquivo: {file_name}")
    audio_input_locator = page_admin.locator(SELECTOR_AUDIO_INPUT)
    
    audio_input_locator.set_input_files(download_path)
        
    page_admin.wait_for_timeout(2000) 
    print(f"✅ Upload concluído.")
    
    # 3. Sequência de Cliques Automatizada (Enviar Áudio e Salvar Dia)
    
    print("\n" + "#"*70)
    print("⚙️ 19. Finalizando: Sequência de Cliques Automatizada.")

    # 1. Clicar em "Enviar Áudio"
    enviar_audio_button = page_admin.locator(SELECTOR_ENVIAR_AUDIO_BUTTON)
    expect(enviar_audio_button).to_be_visible(timeout=10000) 
    print("   -> Clicando em 'Enviar Áudio'.")
    enviar_audio_button.click()

    # 2. Clicar em "Salvar Dia"
    salvar_dia_button = page_admin.locator(SELECTOR_SALVAR_DIA_BUTTON)
    expect(salvar_dia_button).to_be_visible(timeout=10000)
    print("   -> Clicando em 'Salvar Dia'.")
    salvar_dia_button.click()

    print("✅ Sequência de cliques concluída. Aguardando o painel fechar/reaparecer o botão 'Course / Days Management'.")
    
    # Espera que o painel feche (ou que o botão de reabrir reapareça) após o Salvar Dia
    page_admin.locator(SELECTOR_COURSE_DAYS_BUTTON).wait_for(state="visible", timeout=30000)
    
    print("✅ 20. Processo concluído para a frase atual. Pronto para a próxima.")
    page_admin.wait_for_timeout(1000) 


def main():
    
    if not os.path.exists("downloads"):
        os.makedirs("downloads")

    storage_file = 'elevenlabs_auth.json'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=200) 
        
        context = browser.new_context(storage_state=storage_file) if os.path.exists(storage_file) else browser.new_context()

        # 1. Cria a página principal (ADMIN)
        page_admin = context.new_page()

        try:
            selecoes, frases_disponiveis = automatizar_site_1_interativo(page_admin)
            
            if not frases_disponiveis:
                print("❌ Nenhuma frase válida encontrada. Encerrando.")
                return

            print("\n\n" + "="*80)
            print(f"🔥 INICIANDO O LOOP DE PROCESSAMENTO PARA {len(frases_disponiveis)} FRASES.")
            print("="*80 + "\n")

            for i, frase_data in enumerate(frases_disponiveis):
                
                # Chamada da função que agora trata o erro de download/upload internamente
                processar_frase_e_upload(page_admin, context, selecoes, frase_data, i + 1, len(frases_disponiveis), storage_file)
                
                # Salva o estado do login após cada ciclo (útil, mas opcional)
                context.storage_state(path=storage_file)

            print("\n\n" + "🌟"*20)
            print("TODAS AS FRASES FORAM PROCESSADAS E ENVIADAS AUTOMATICAMENTE (OU PULADAS SE HOUVE ERRO)!")
            print("🌟"*20)

        except Exception as e:
            # Este bloco só será atingido se houver um erro antes do loop (ex: login, seleção inicial)
            # ou se ocorrer um erro crítico após o download na aba Admin.
            print(f"\n❌ Ocorreu um erro FATAL fora do loop de frase: {e}")
        
        finally:
            print("\nAutomação finalizada. Fechando o navegador em 5 segundos...")
            time.sleep(5) 
            browser.close()

if __name__ == "__main__":
    main()