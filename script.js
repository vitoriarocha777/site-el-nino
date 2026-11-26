
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // SUPABASE
    // =====================================

    const SUPABASE_URL =
        "https://kkcfwlczfdkvftrfbzeg.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_4V9SjvnLv-if3xJC0U48FA_zkbZkDBq";

    if (!window.supabase) {
        console.error("Biblioteca Supabase não carregada.");
        return;
    }

    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    // =====================================
    // ELEMENTOS HTML
    // =====================================

    const formulario = document.getElementById("formCliente");
    const status = document.getElementById("status");
    const btnSalvar = document.getElementById("btnSalvar");

    if (!formulario || !status || !btnSalvar) {
        console.error("Verifique os IDs do formulário HTML.");
        return;
    }

    function mostrarStatus(mensagem, tipo = "") {
        status.textContent = mensagem;
        status.className = tipo;
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }

    // Evita finalizar o mesmo cadastro simultaneamente
    let finalizando = false;

    // =====================================
    // FINALIZAR APOS CONFIRMACAO
    // =====================================

    async function finalizarCadastro(session) {

        if (finalizando || !session) return;

        const usuario = session.user;

        // Exigir confirmacao real do email
        if (!usuario.email_confirmed_at) {
            mostrarStatus(
                "Seu email ainda não foi confirmado.",
                "erro"
            );
            return;
        }

        const nome = usuario.user_metadata?.nome;
        const telefone = usuario.user_metadata?.telefone;

        if (!nome || !telefone || !usuario.email) {
            mostrarStatus(
                "Não foi possível recuperar os dados do cadastro.",
                "erro"
            );
            return;
        }

        finalizando = true;

        try {

            mostrarStatus(
                "Email confirmado! Finalizando cadastro...",
                "carregando"
            );

            // Verificar perfil existente
            const { data: perfil, error: erroBusca } =
                await supabaseClient
                    .from("usuarios")
                    .select("id")
                    .eq("auth_user_id", usuario.id)
                    .maybeSingle();

            if (erroBusca) throw erroBusca;

            // Não duplicar perfil
            if (perfil) {
                mostrarStatus(
                    "Sua conta já está cadastrada e confirmada!",
                    "sucesso"
                );
                return;
            }

            // Criar perfil após confirmação
            const { error: erroCadastro } =
                await supabaseClient
                    .from("usuarios")
                    .insert({
                        auth_user_id: usuario.id,
                        nome: nome,
                        email: usuario.email.toLowerCase(),
                        telefone: telefone
                    });

            if (erroCadastro) throw erroCadastro;

            mostrarStatus(
                "Cadastro concluído! Seu email foi confirmado.",
                "sucesso"
            );

            formulario.reset();

            console.log("Perfil criado:", usuario.id);

        } catch (erro) {

            mostrarStatus(
                "Erro ao finalizar cadastro: " + erro.message,
                "erro"
            );

            console.error("Erro no perfil:", erro);

        } finally {
            finalizando = false;
        }
    }

    // =====================================
    // ENVIAR LINK DE CONFIRMACAO
    // =====================================

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (btnSalvar.disabled) return;

        const nome =
            document.getElementById("nome").value.trim();

        const email =
            document.getElementById("email").value
                .trim()
                .toLowerCase();

        const telefone =
            document.getElementById("telefone").value.trim();

        if (!nome || !email || !telefone) {
            mostrarStatus(
                "Preencha todos os campos.",
                "erro"
            );
            return;
        }

        if (!validarEmail(email)) {
            mostrarStatus(
                "Digite um endereço de email válido.",
                "erro"
            );
            return;
        }

        btnSalvar.disabled = true;

        mostrarStatus(
            "Enviando link de confirmação...",
            "carregando"
        );

        try {

            const redirectURL =
                window.location.origin +
                window.location.pathname;

            const { error } =
                await supabaseClient.auth.signInWithOtp({

                    email: email,

                    options: {
                        shouldCreateUser: true,
                        emailRedirectTo: redirectURL,

                        data: {
                            nome: nome,
                            telefone: telefone
                        }
                    }
                });

            if (error) throw error;

            mostrarStatus(
                "Solicitação enviada! Verifique seu email e clique no link de confirmação. Confira também a caixa de spam.",
                "sucesso"
            );

            formulario.reset();

        } catch (erro) {

            mostrarStatus(
                "Erro ao enviar confirmação: " + erro.message,
                "erro"
            );

            console.error(erro);

        } finally {

            btnSalvar.disabled = false;

        }
    });

    // =====================================
    // DETECTAR CONFIRMACAO DO EMAIL
    // =====================================

    supabaseClient.auth.onAuthStateChange(
        (evento, session) => {

            if (evento === "SIGNED_IN" && session) {

                // Executar fora do callback de autenticação
                setTimeout(() => {
                    finalizarCadastro(session);
                }, 0);

            }
        }
    );

    // Verificar sessao ao abrir a pagina
    supabaseClient.auth.getSession().then(
        ({ data, error }) => {

            if (error) {
                console.error(error);
                return;
            }

            if (data.session) {
                finalizarCadastro(data.session);
            }
        }
    );

    console.log("Sistema de cadastro iniciado.");

});
