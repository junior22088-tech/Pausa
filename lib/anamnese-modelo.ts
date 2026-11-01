// Modelo de anamnese. Hoje há só o "padrão"; o formato (lista de campos) já serve para
// modelos personalizados no futuro, guardados no banco com o mesmo desenho.

export type Campo =
  | { id: string; tipo: 'simnao'; rotulo: string; detalhe?: string; alerta?: boolean }
  | { id: string; tipo: 'escolha'; rotulo: string; opcoes: string[] }
  | { id: string; tipo: 'texto'; rotulo: string; max: number; dica?: string };

export type Modelo = { id: string; versao: number; titulo: string; grupos: { titulo: string; campos: Campo[] }[] };

export const MODELO_PADRAO: Modelo = {
  id: 'padrao',
  versao: 1,
  titulo: 'Anamnese padrão',
  grupos: [
    {
      titulo: 'Contraindicações e cuidados',
      campos: [
        { id: 'gestante', tipo: 'simnao', rotulo: 'Está grávida?', detalhe: 'Quantas semanas?', alerta: true },
        { id: 'pressao', tipo: 'simnao', rotulo: 'Pressão alta ou baixa?', detalhe: 'Controlada? Usa remédio?', alerta: true },
        { id: 'circulacao', tipo: 'simnao', rotulo: 'Trombose, varizes ou problema de circulação?', detalhe: 'Onde?', alerta: true },
        { id: 'anticoagulante', tipo: 'simnao', rotulo: 'Toma anticoagulante?', alerta: true },
        { id: 'cirurgia', tipo: 'simnao', rotulo: 'Cirurgia nos últimos 6 meses?', detalhe: 'Qual e quando?', alerta: true },
        { id: 'lesao', tipo: 'simnao', rotulo: 'Lesão, dor ou inflamação em alguma região?', detalhe: 'Onde?', alerta: true },
        { id: 'pele', tipo: 'simnao', rotulo: 'Ferida, alergia ou problema de pele?', detalhe: 'Onde?', alerta: true },
        { id: 'alergia_produtos', tipo: 'simnao', rotulo: 'Alergia a óleos, cremes ou aromas?', detalhe: 'A quê?', alerta: true },
        { id: 'febre', tipo: 'simnao', rotulo: 'Febre, gripe ou infecção agora?', alerta: true },
        { id: 'tratamento', tipo: 'simnao', rotulo: 'Em tratamento médico (ex.: câncer, diabetes, coração)?', detalhe: 'Qual?', alerta: true },
        { id: 'medicamentos', tipo: 'simnao', rotulo: 'Usa outros remédios de uso contínuo?', detalhe: 'Quais?' },
      ],
    },
    {
      titulo: 'Preferências',
      campos: [
        { id: 'objetivo', tipo: 'escolha', rotulo: 'Objetivo principal', opcoes: ['Relaxar', 'Aliviar dor ou tensão', 'Drenagem / inchaço', 'Outro'] },
        { id: 'pressao_toque', tipo: 'escolha', rotulo: 'Pressão da massagem', opcoes: ['Leve', 'Média', 'Forte'] },
        { id: 'evitar', tipo: 'texto', rotulo: 'Regiões para evitar', max: 120 },
      ],
    },
    {
      titulo: 'Observações',
      campos: [
        { id: 'obs', tipo: 'texto', rotulo: 'Observação curta', max: 300, dica: 'Só o necessário para atender com segurança. Não anote diagnósticos nem exames.' },
      ],
    },
  ],
};

export const MODELOS: Record<string, Modelo> = { padrao: MODELO_PADRAO };

export type Respostas = Record<string, { valor: string; detalhe?: string }>;

/** Lê o formulário seguindo o modelo; ignora campos que não existem e corta textos longos. */
export function lerRespostas(modelo: Modelo, fd: { get(n: string): unknown }): Respostas {
  const r: Respostas = {};
  for (const g of modelo.grupos) for (const c of g.campos) {
    const bruto = String(fd.get(`c_${c.id}`) ?? '').trim();
    if (c.tipo === 'simnao') {
      if (bruto !== 'sim' && bruto !== 'nao') continue;
      const detalhe = c.detalhe && bruto === 'sim' ? String(fd.get(`d_${c.id}`) ?? '').trim().slice(0, 120) : '';
      r[c.id] = detalhe ? { valor: bruto, detalhe } : { valor: bruto };
    } else if (c.tipo === 'escolha') {
      if (c.opcoes.includes(bruto)) r[c.id] = { valor: bruto };
    } else if (bruto) {
      r[c.id] = { valor: bruto.slice(0, c.max) };
    }
  }
  return r;
}

/** Itens marcados como "sim" em campos de alerta (para o destaque dentro da ficha). */
export function alertas(modelo: Modelo, r: Respostas) {
  return modelo.grupos.flatMap((g) => g.campos)
    .filter((c) => c.tipo === 'simnao' && c.alerta && r[c.id]?.valor === 'sim')
    .map((c) => ({ rotulo: c.rotulo, detalhe: r[c.id]?.detalhe }));
}
