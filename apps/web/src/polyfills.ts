import { Buffer } from 'buffer';

// Polyfill do Buffer para bibliotecas TON (@ton/core, @tonconnect/*) rodarem no navegador.
// Precisa ser o PRIMEIRO import do main.tsx para garantir que window.Buffer já exista
// antes de qualquer outro módulo (como @ton/core) ser avaliado.
(window as any).Buffer = (window as any).Buffer || Buffer;
