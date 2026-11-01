import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { salvarHorarios } from '@/lib/actions';
import { Aviso, Cartao, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { SeletorHora } from '@/components/SeletorHora';

const DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const INTERVALOS = [0, 5, 10, 15, 20, 30, 45, 60];

export default async function Horarios({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { semana, intervalo } = await configAgenda(supabase, user.id);
  const cfg = (d: number) => semana.find((s) => s.dia_semana === d) ?? { dia_semana: d, atende: false, inicio_min: 540, fim_min: 1080, almoco_inicio_min: null, almoco_fim_min: null };

  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar="/ajustes" voltarRotulo="Ajustes">Horários de atendimento</Titulo>
      <p className="-mt-2 text-[0.9rem] text-stone-600">Só aparecem como livres os horários dentro destes períodos. Para um dia ou período sem atendimento, use <a href="/ajustes/folgas" className="font-semibold text-emerald-800 underline">Folgas e bloqueios</a>.</p>
      <Aviso erro={erro} />

      <form action={salvarHorarios} className="space-y-4">
        <Cartao>
          <label className="block">
            <span className={rotulo}>Intervalo entre sessões</span>
            <select name="intervalo" defaultValue={String(intervalo)} className={campo}>
              {INTERVALOS.map((m) => <option key={m} value={m}>{m === 0 ? 'Sem intervalo' : `${m} min`}</option>)}
            </select>
          </label>
          <p className="mt-1.5 text-[0.8rem] text-stone-500">Tempo reservado depois de cada sessão, antes da próxima poder começar.</p>
        </Cartao>

        <ul className="space-y-3">
          {DIAS.map((d) => {
            const c = cfg(d);
            const temAlmoco = c.almoco_inicio_min != null;
            return (
              <li key={d}>
                <div className="group/dia rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4">
                    <input type="checkbox" name={`atende_${d}`} defaultChecked={c.atende} className="atende size-5 accent-emerald-700" />
                    <span className="flex-1 text-base font-semibold">{NOMES[d]}</span>
                    <span className="text-[0.8rem] text-stone-500 group-has-[.atende:checked]/dia:hidden">não atende</span>
                  </label>
                  <div className="hidden space-y-3 px-4 pb-4 group-has-[.atende:checked]/dia:block">
                    <div className="grid grid-cols-2 gap-3">
                      <label><span className={rotulo}>Início</span><SeletorHora nome={`inicio_${d}`} valor={c.inicio_min} de={360} ate={1320} rotulo={`Início na ${NOMES[d]}`} /></label>
                      <label><span className={rotulo}>Fim</span><SeletorHora nome={`fim_${d}`} valor={c.fim_min} de={360} ate={1320} rotulo={`Fim na ${NOMES[d]}`} /></label>
                    </div>
                    <div className="group/almoco">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
                        <input type="checkbox" name={`almoco_${d}`} defaultChecked={temAlmoco} className="almoco size-5 accent-emerald-700" />
                        Pausa de almoço
                      </label>
                      <div className="mt-2 hidden grid-cols-2 gap-3 group-has-[.almoco:checked]/almoco:grid">
                        <label><span className={rotulo}>Almoço de</span><SeletorHora nome={`almoco_inicio_${d}`} valor={c.almoco_inicio_min ?? 720} de={360} ate={1320} rotulo={`Início do almoço na ${NOMES[d]}`} /></label>
                        <label><span className={rotulo}>até</span><SeletorHora nome={`almoco_fim_${d}`} valor={c.almoco_fim_min ?? 780} de={360} ate={1320} rotulo={`Fim do almoço na ${NOMES[d]}`} /></label>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Enviar className={`${btnPrimario} w-full`}>Salvar horários</Enviar>
      </form>
    </div>
  );
}
