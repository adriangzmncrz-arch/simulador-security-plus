# Cómo contribuir

¡Gracias por ayudar! Las contribuciones más útiles son preguntas nuevas, correcciones de preguntas existentes y reportes de errores.

## Reglas para preguntas nuevas

1. **Originales, nunca de dumps.** Escríbelas tú a partir del temario oficial y de tu experiencia. No copies ni parafrasees preguntas del examen real, de bancos comerciales ni de sitios de "dumps". Un PR con preguntas que parezcan copiadas se cierra.
2. **Mapeadas a un objetivo.** Cada pregunta lleva su `objective` del temario SY0-701 (`"1.1"` … `"5.6"`). Su `domain` y el prefijo de su `id` deben coincidir con el primer dígito del objetivo.
3. **Explicación completa.** La `explanation` dice por qué la respuesta correcta lo es **y por qué las otras no**. En las PBQ, justifica cada clasificación.
4. **Términos técnicos en inglés.** El texto va en español, pero los términos del examen se dejan como aparecen en el temario: *phishing*, *least privilege*, *SIEM*, *Preventive*, *Compensating*, etc. Así coinciden con lo que vas a ver el día del examen.
5. **Una sola respuesta defendible.** Evita preguntas ambiguas o que dependan de un producto o versión específicos. Si usas logs o comandos, ponlos en un bloque ``` dentro del `stem`.
6. **Formato.**
   - `single`: 4 opciones.
   - `multi`: 5–6 opciones, 2 o 3 respuestas, y el stem termina en "(Elige DOS.)" o "(Elige TRES.)".
   - `match`: 4–6 `items`, 3–6 `choices`, sin `options`.
   - `difficulty`: 1 (recordar), 2 (aplicar) o 3 (analizar un escenario).
   - Que la longitud no delate la respuesta: la correcta no debe ser casi siempre la opción más larga ni la más detallada. Da a los distractores un nivel de detalle parecido. No importa en qué posición la pongas: la app baraja las opciones en cada intento.
7. **IDs.** Usa el siguiente número libre del dominio (`D3-051`, `D3-052`…). No cambies los IDs existentes: el historial de las personas depende de ellos.

## Antes de abrir el pull request

```bash
npm ci
npm run validate    # el banco cumple el esquema y las reglas
npm run typecheck
npm test
npm run e2e         # opcional en local; la CI lo corre
```

Agrega las preguntas al final del archivo de su dominio y describe en el PR qué objetivos cubren.

## Corregir una pregunta existente

Abre un issue o un PR explicando el error y citando la fuente (por ejemplo, el documento de objetivos de CompTIA o la documentación del fabricante). Mantén el `id`.

## Cambios en el código

- TypeScript en vanilla, sin frameworks de UI ni dependencias en tiempo de ejecución.
- El aspecto lo define `reference/simulador-referencia.html`. No cambies tokens ni medidas sin una buena razón y sin actualizar las capturas (`npm run screenshots`).
- Todo texto que venga del banco o del usuario se escapa antes de insertarlo (`src/ui/rich.ts`).
- Agrega o ajusta tests en `tests/unit` o `tests/e2e` según corresponda.

Al contribuir aceptas que tu código se publique bajo MIT y tus preguntas bajo CC BY 4.0.
