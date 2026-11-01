# Banco de dados e RLS

Migrações em `supabase/migrations/`: `schema_inicial`, `licenca_estado` e `agenda_servicos`.

## Tabelas

| Tabela | Papel | Pontos-chave |
|---|---|---|
| `profissionais` | 1:1 com `auth.users` | criada por trigger `ao_criar_usuario`; textos das mensagens |
| `clientes` | nome + telefone | telefone `^[0-9]{12,13}$` (55 + DDD + número) |
| `pacotes` | combinado | `total_sessoes`, `valor_centavos`, `validade_ate`, `regra_cancelamento` (cópia), `situacao`, `pago` |
| `sessoes` | agenda | `situacao` marcada/feita/cancelada; `desconta`; `valor_avulso_centavos`; `pago` (avulsa) |
| `pagamentos` | anotação | nunca apagado: `anulado_em` |
| `aceites` | prova do combinado | `texto_enviado`, `hash_sha256`, `versao`, `resposta_literal` |
| `eventos` | linha do tempo | **append-only**: só `select` e `insert` |
| `servicos` | o que se atende | `duracao_min` 10–480, `preco_centavos`, `ativo` (desativar em vez de apagar) |
| `horarios_semana` | expediente | PK (`profissional_id`, `dia_semana` 0=dom); minutos desde 00:00; almoço opcional |
| `bloqueios` | folgas | `data_inicio`/`data_fim`, `dia_inteiro` ou `inicio_min`/`fim_min` |

`profissionais.intervalo_min` (padrão 15) é o intervalo entre sessões. `pacotes.servico_id` liga o pacote a um serviço.

## Trava de conflito

Cada sessão guarda `duracao_min` e `intervalo_min` do momento da marcação (mudar o serviço não altera o passado). O trigger `calcular_ocupado_ate` grava `ocupado_ate = inicio + duração + intervalo`, e uma *exclusion constraint* (extensão `btree_gist`) impede sobreposição:

```sql
exclude using gist (profissional_id with =, tstzrange(inicio, ocupado_ate) with &&)
  where (situacao <> 'cancelada')
```

O app checa antes (`exigirHorarioLivre` em `lib/actions.ts`, com mensagem dizendo quem ocupa o horário), mas a garantia é do banco: duas marcações simultâneas no mesmo horário → a segunda recebe o erro `23P01` e vira o mesmo aviso de conflito. Os horários livres são calculados em `lib/agenda-horarios.ts` (puro, testado em `npm run test:agenda`).

## Saldo

```sql
saldo = greatest(total_sessoes - count(sessoes
          where situacao in ('feita','cancelada') and desconta), 0)
```

A view `pacotes_saldo` usa `security_invoker = true`, ou seja, respeita o RLS de quem consulta. `servico_id` é a última coluna (recriada com `create or replace`, sem `drop`).

## Isolamento (três camadas)

1. **RLS** em todas as tabelas: `profissional_id = auth.uid()` em `using` e `with check`.
2. **Grants mínimos**: o Supabase concede tudo a `anon`/`authenticated` por padrão; a migração revoga e concede só o necessário. `anon` não tem acesso a nada.
3. **Triggers de referência** (`checar_dono_referencias`, `checar_dono_aceite`, `checar_dono_servico`): impedem ligar um pacote, sessão, pagamento ou evento a cliente/pacote de outro profissional, mesmo que o ID seja conhecido.

`profissional_id` tem `default auth.uid()`; o app nunca envia esse campo.

## Estado em produção

- Projeto Supabase `pausa` (`mefpbqlymcfjenyzrylk`, sa-east-1), migração `schema_inicial` aplicada em 01/11/2026.
- `agenda_servicos` aplicada em 01/11/2026. Sessões antigas ganharam 60 min de duração e 0 de intervalo; todos os perfis receberam a semana padrão (seg–sex 9h–18h, almoço 12h–13h).
- Security Advisor: nenhum alerta novo das tabelas; os avisos restantes são das funções de licença (intencionais) e da proteção de senha vazada (ligar no painel).
