// Formatar em hora local e o comportamento certo no app, mas um teste que
// depende do fuso da maquina passa em BRT e falha na CI (UTC). A suite fixa o
// fuso no mesmo padrao do agente (TZ em .env.example).
process.env.TZ = "America/Sao_Paulo";
