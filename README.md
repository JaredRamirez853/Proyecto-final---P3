# GameHub

GameHub es una plataforma web para descubrir videojuegos, consultar información y acceder a enlaces de distintas tiendas digitales.

## Tecnologías

- HTML, CSS, JavaScript y TypeScript
- Node.js y Express
- MySQL
- JWT y bcryptjs
- RAWG API
- Jest y Supertest
- Git y GitHub

## Requisitos

- Node.js 20 o superior
- MySQL 8
- Una API key de RAWG para las funciones de integración externa

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y configura las variables.

Ejecuta el script SQL de `src/db/schema.sql` en MySQL y luego:

```bash
npm run db:seed
```

Para desarrollo:

```bash
npm run dev
```

Para pruebas:

```bash
npm test
```

## Usuario administrador inicial

- correo: `admin@gamehub.local`
- contraseña: `admin123`

Cambia la contraseña antes de usar el sistema en un entorno real.

## Carga inicial del catálogo

GameHub incluye un script para importar aproximadamente 70 videojuegos desde RAWG. La biblioteca utiliza el rating de los juegos para determinar la sección Destacados.

Las ofertas iniciales son datos de demostración administrados por GameHub para poder probar la sección de Ofertas. El administrador puede modificarlas posteriormente desde el sistema.

Para cargar el catálogo:

```bash
npm run db:seed:rawg
```

## Catálogo inicial

El cargador de RAWG prioriza juegos de PC desde 2012, novedades 2025-2026 y próximos lanzamientos, y puede poblar una biblioteca de hasta 300 juegos.

## Automatización de pruebas

GameHub utiliza Jest y Supertest para comprobar validaciones de entrada, protección de rutas, autenticación requerida y operaciones administrativas.

Ejecutar todas las pruebas:

```bash
npm test
```

## Reporte HTML de pruebas

Después de ejecutar:

```bash
npm run test:report
```

Jest genera el reporte visual en:

```text
test-report/test-report.html
```

También se genera la cobertura dentro de:

```text
coverage/lcov-report/index.html
```
