import { DocArticle } from '../types';
import { requisitosDelSistemaArticle } from './primeros-pasos/01-requisitos-del-sistema';
import { instalacionYDespliegueArticle } from './primeros-pasos/02-instalacion-y-despliegue';
import { activacionDeLicenciasArticle } from './primeros-pasos/03-activacion-de-licencias';
import { asistenteDeConfiguracionArticle } from './primeros-pasos/04-asistente-de-configuracion';

export {
  requisitosDelSistemaArticle,
  instalacionYDespliegueArticle,
  activacionDeLicenciasArticle,
  asistenteDeConfiguracionArticle,
};

export const primerosPasosArticles: DocArticle[] = [
  requisitosDelSistemaArticle,
  instalacionYDespliegueArticle,
  activacionDeLicenciasArticle,
  asistenteDeConfiguracionArticle,
];
