export interface InstrumentDefinition {
  code: string;
}

export const normalizeInstrumentCode = (value: string) => value.trim().toUpperCase();

const buildInstrumentMap = (instruments: InstrumentDefinition[]) => {
  return new Map(instruments.map(instrument => [normalizeInstrumentCode(instrument.code), instrument]));
};

export const resolveTradingViewSymbol = (instrument: string, instruments: InstrumentDefinition[] = []): string => {
  const candidates = getTradingViewSymbolCandidates(instrument, instruments);
  if (candidates.length > 0) {
    return candidates[0];
  }

  return 'TVC:GOLD';
};

export const getTradingViewSymbolCandidates = (instrument: string, instruments: InstrumentDefinition[] = []): string[] => {
  const normalized = normalizeInstrumentCode(instrument);

  if (normalized.includes(':')) {
    return [normalized];
  }

  const definition = buildInstrumentMap(instruments).get(normalized);
  if (definition && normalizeInstrumentCode(definition.code).includes(':')) {
    return [normalizeInstrumentCode(definition.code)];
  }

  return [];
};

export const getInstrumentLabel = (instrument: string, instruments: InstrumentDefinition[] = []): string => {
  const normalized = normalizeInstrumentCode(instrument);
  return buildInstrumentMap(instruments).get(normalized)?.code || normalized || 'UNKNOWN';
};
