# Catapp

Organiza catas de vino a ciegas entre amigos. Cada persona puede votar desde su
móvil y ver el revelado copa a copa al terminar. Las notas privadas se guardan
en el navegador donde se escriben.

- Web pública: [Catapp](https://jegomei.github.io/catapp/)
- GitHub Pages publica la carpeta `docs/` de la rama `main`.
- El servidor de las salas se despliega por separado en Sites con una base
  Cloudflare D1 y la migración de `drizzle/`. Su URL está en `docs/index.html`.

Para probar toda la aplicación localmente, ejecuta `npm run dev` con Node.js 24
y abre la dirección que imprime el comando. Las salas locales se guardan en una
base SQLite en memoria y duran hasta que se detiene el servidor.

Para compilar solo la API, ejecuta
`npm run build -- --pages-origin https://jegomei.github.io`.
