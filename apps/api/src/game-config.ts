export const FORGE_RULES={
  Comum:{next:'Raro' as const,chance:0.75,dailyMultiplier:2.0},
  Raro:{next:'Épico' as const,chance:0.20,dailyMultiplier:2.1},
  Épico:{next:'Lendário' as const,chance:0.02,dailyMultiplier:2.2},
} as const;

// Arquivo do operador: acrescente, edite ou remova códigos aqui. Nunca exponha estes dados no front-end.
export const BONUS_CODES={
  AMIGOSTYLE:{maxClaims:5,label:'5 lançamentos no Lago',reward:{kind:'map_bait' as const,map:'lake' as const,quantity:5}},
  '21KOLUAZPO':{maxClaims:1,label:'100.000.000 FISH e 100.000.000 CASH',reward:{kind:'wallet' as const,fish:100_000_000,cash:100_000_000}},
  TESTERIO20000:{maxClaims:1,label:'40.000 FISH e 40.000 CASH para teste de saque',reward:{kind:'wallet' as const,fish:40_000,cash:40_000}},
  RIOFANTI:{maxClaims:3,label:'Saldo de teste por 7 dias: 5.000.000 FISH e 5.000.000 CASH',reward:{kind:'temporary_wallet' as const,fish:5_000_000,cash:5_000_000,durationDays:7}},
  SANDERO:{maxClaims:2,label:'Saldo de teste por 7 dias: 5.000.000 FISH e 5.000.000 CASH',reward:{kind:'temporary_wallet' as const,fish:5_000_000,cash:5_000_000,durationDays:7}},
  NERDLOCUTOR:{maxClaims:2,label:'Saldo de teste por 7 dias: 5.000.000 FISH e 5.000.000 CASH',reward:{kind:'temporary_wallet' as const,fish:5_000_000,cash:5_000_000,durationDays:7}},  
} as const;
