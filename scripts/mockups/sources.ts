/**
 * Origen de cada foto base: enlace de descarga a resolución completa (960×1280 PNG) que devolvió la
 * generación con IA en el archivo de Figma `hayx2oxepmMhVgQEMGA7Pa`.
 *
 * Los enlaces CADUCAN a los 7 días de generarse (generados el 22 y el 23 de octubre de 2026).
 * Después hay que exportar el frame desde Figma (nodo indicado) o regenerarlo.
 * `pnpm mockups:bases` descarga las que falten en `bases/` y las guarda como WebP.
 */
export interface BaseSourceUrl {
  node: string;
  url: string;
}

const asset = (id: string) => `https://www.figma.com/api/mcp/asset/${id}.png`;

export const BASE_SOURCES: Record<string, BaseSourceUrl> = {
  // Camisetas y sudaderas (algunas ya están en bases/).
  'tee-negro-front': { node: '10:2', url: asset('a55df6a5-3186-4ff9-8e79-77d845029179') },
  'hoodie-negro-front': { node: '11:2', url: asset('7cf8471d-23ba-46f6-a594-56ea1b69767a') },
  'tee-negro-back': { node: '14:2', url: asset('efbf82ba-0771-4f6a-8d39-345ae75439b0') },
  'tee-blanco-front': { node: '15:2', url: asset('08cd134f-0a71-4176-aec9-25fba56654f6') },
  'tee-blanco-back': { node: '16:2', url: asset('01332c3b-cde3-442c-89e6-cf5c67895a09') },
  'tee-grafito-front': { node: '17:2', url: asset('0826a96b-7bf4-4173-9db5-0e496dfda04e') },
  'tee-grafito-back': { node: '18:2', url: asset('08ca6d71-c688-4d3d-a81e-7ce2eb3738de') },
  'hoodie-negro-back': { node: '19:2', url: asset('ca4fbee5-2e2e-4bb7-8d62-273878fe2ae0') },
  'hoodie-gris-front': { node: '26:2', url: asset('31c8d0cc-4dc3-41b4-aa28-8801b2fdeea2') },
  'hoodie-gris-back': { node: '27:2', url: asset('7ff5bad1-2a3d-4e44-a7ab-a9e43b73290b') },
  'hoodiecord-negro-front': { node: '28:2', url: asset('5ac0c904-573a-4c0f-b1d3-6531c565be97') },
  'hoodiecord-grafito-front': { node: '29:2', url: asset('7e07e8c4-90e9-40c9-8e61-2a1b62af2e70') },
  'hoodie-grafito-back': { node: '30:2', url: asset('2a851bbc-5a15-4c39-825f-934b21f43e16') },
  'hoodiecord-blanco-front': { node: '31:2', url: asset('a7ae100d-fd71-418d-820b-04a00735d5e0') },
  'hoodie-blanco-back': { node: '32:2', url: asset('07b3fab7-5db0-48ba-8a36-e559b03cc68a') },
  // Manga larga, jogger, cargo y short: versiones oversize / baggy (23 de octubre).
  'cargo-negro-front': { node: '53:2', url: asset('4a6a5999-9bba-48a1-9236-375c9ae9d737') },
  'cargo-negro-back': { node: '54:2', url: asset('64e473ca-8cc3-457b-9ea7-279cc82994dc') },
  'ls-negro-front': { node: '55:2', url: asset('f324fd7e-2382-4c2c-a774-a854260fab3a') },
  'ls-negro-back': { node: '56:2', url: asset('ad5c968b-fee7-4989-9bbc-9f224aaf95ad') },
  'ls-blanco-front': { node: '57:2', url: asset('cb1354c5-12bf-4ee6-954f-672c713c45e8') },
  'ls-blanco-back': { node: '58:2', url: asset('6a80ef9a-af1b-412a-b1a0-2e27acfcfca5') },
  'ls-gris-front': { node: '59:2', url: asset('09fc2c58-fc34-4e44-9cca-027655451077') },
  'ls-gris-back': { node: '60:2', url: asset('0bfba805-460b-4c08-83b2-7291a9911bcf') },
  'jogger-negro-front': { node: '61:2', url: asset('76ef8bcb-5009-47f2-ba54-eca8527ba125') },
  'jogger-negro-back': { node: '62:2', url: asset('624a57a5-70a4-47ba-a05f-acbe1a26ff8e') },
  'jogger-grafito-front': { node: '63:2', url: asset('9198e632-b7a7-4c86-8b8f-6ae3ffeb98c6') },
  'jogger-grafito-back': { node: '64:2', url: asset('6b1c0fc1-14b1-4512-9f9f-000ce7c3b120') },
  'shorts-negro-front': { node: '65:2', url: asset('a04d9bd5-6617-44ba-bcb6-4c7cdca51f66') },
  'shorts-negro-back': { node: '66:2', url: asset('bff2f375-055c-456a-b8a1-5fc3552e4c38') },
  'shorts-rojo-front': { node: '67:2', url: asset('40d1fd8b-3805-43f9-8cfb-1183f1d7cb30') },
  'shorts-rojo-back': { node: '68:2', url: asset('24268a54-908a-47db-a368-51b9031a1854') },
  // Accesorios.
  'cap-negro-front': { node: '43:2', url: asset('6ffeb570-4354-4d90-b6e3-0b4d867371b4') },
  'cap-negro-back': { node: '44:2', url: asset('7193a7d1-26d5-4d3c-8770-775e4ee02ada') },
  'cap-blanco-front': { node: '45:2', url: asset('b632dc28-6a59-4411-b18d-138699146b6e') },
  'cap-blanco-back': { node: '46:2', url: asset('2da5e03e-1651-4345-bd22-c6f1cd0ade47') },
  'beanie-negro-front': { node: '47:2', url: asset('2055fb5b-07d0-4ce9-add5-6df7e241d69a') },
  'beanie-rojo-front': { node: '48:2', url: asset('eb81ed3e-6f01-4228-a975-3eac0cf2bd9a') },
  'tote-negro-front': { node: '49:2', url: asset('82414caf-6aaa-43f6-be02-afc031b88092') },
  'tote-blanco-front': { node: '50:2', url: asset('c8755477-e748-47f2-99fb-da2edd2565ff') },
  'socks-negro-front': { node: '51:2', url: asset('b20d0b78-792b-4eb5-ac3d-b182495a44f1') },
  'socks-blanco-front': { node: '52:2', url: asset('4ce87304-59b1-467e-b499-8757d4c78202') },
};
