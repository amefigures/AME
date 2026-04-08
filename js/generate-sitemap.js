// generate-sitemap.js
// Generador de sitemap.xml para AME Figures
// Ejecutar con: node js/generate-sitemap.js

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN - RUTAS CORREGIDAS
// ============================================
const DOMAIN = 'https://amefigures.github.io/AME';
const PRODUCTOS_JS_PATH = path.join(__dirname, 'productos.js');
const CATEGORIAS_DIR = path.join(__dirname, '../categorias/');  
const SITEMAP_PATH = path.join(__dirname, '../sitemap.xml');   

// ============================================
// LEER PRODUCTOS.JS
// ============================================
console.log('📖 Leyendo productos.js...');
console.log(`   Ruta: ${PRODUCTOS_JS_PATH}`);

if (!fs.existsSync(PRODUCTOS_JS_PATH)) {
    console.error(`❌ No se encuentra productos.js en: ${PRODUCTOS_JS_PATH}`);
    process.exit(1);
}

const productosContent = fs.readFileSync(PRODUCTOS_JS_PATH, 'utf8');

const productosMatch = productosContent.match(/const productos = (\[[\s\S]*?\]);/);
if (!productosMatch) {
    console.error('❌ No se pudo encontrar el array de productos');
    process.exit(1);
}

const productos = eval(`(${productosMatch[1]})`);
console.log(`✅ Encontrados ${productos.length} productos`);

// ============================================
// OBTENER CATEGORÍAS PRINCIPALES
// ============================================
const categoriasPrincipales = [...new Set(productos.map(p => p.categoriaPadre || p.categoria))];
console.log(`📁 Categorías encontradas: ${categoriasPrincipales.length}`);

// ============================================
// FUNCIÓN PARA GENERAR URL AMIGABLE DE PRODUCTO
// ============================================
function generarUrlProducto(nombre, id) {
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[ñ]/g, "n")
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + id;
}

// ============================================
// FUNCIÓN PARA GENERAR URL AMIGABLE DE CATEGORÍA
// ============================================
function generarUrlCategoria(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[ñ]/g, "n")
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============================================
// OBTENER FECHA ACTUAL
// ============================================
const today = new Date().toISOString().split('T')[0];

// ============================================
// GENERAR SITEMAP.XML
// ============================================
console.log('\n🔄 Generando sitemap.xml...\n');

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:geo="http://www.google.com/schemas/sitemap-geo/1.0">`;

// ============================================
// 1. PÁGINA PRINCIPAL
// ============================================
console.log(`   ✅ Página principal: ${DOMAIN}/`);
sitemap += `
  <!-- Página principal -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

// ============================================
// 2. ÍNDICE DE CATEGORÍAS (si existe)
// ============================================
if (fs.existsSync(path.join(CATEGORIAS_DIR, 'index.html'))) {
    console.log(`   ✅ Índice de categorías: ${DOMAIN}/categorias/index.html`);
    sitemap += `
  <!-- Índice de categorías -->
  <url>
    <loc>${DOMAIN}/categorias/index.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
}

// ============================================
// 3. PÁGINAS DE CATEGORÍAS
// ============================================
categoriasPrincipales.forEach(categoria => {
    const categoriaUrl = generarUrlCategoria(categoria);
    const productosCategoria = productos.filter(p => (p.categoriaPadre || p.categoria) === categoria);
    const cantidad = productosCategoria.length;
    
    console.log(`   ✅ Categoría: ${categoria} (${cantidad} productos) → ${DOMAIN}/categorias/${categoriaUrl}.html`);
    sitemap += `
  <!-- Categoría: ${categoria} -->
  <url>
    <loc>${DOMAIN}/categorias/${categoriaUrl}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
});

// ============================================
// 4. PÁGINAS DE PRODUCTOS
// ============================================
let productosConImagenes = 0;

productos.forEach((producto, index) => {
    const urlProducto = generarUrlProducto(producto.nombre, producto.id);
    
    // Procesar imágenes para el sitemap de imágenes
    let imagenesArray = [];
    if (typeof producto.imagenes === 'string' && producto.imagenes.trim()) {
        imagenesArray = producto.imagenes.split(',').map(url => url.trim()).filter(url => url);
    } else if (Array.isArray(producto.imagenes)) {
        imagenesArray = producto.imagenes;
    }
    
    // Prioridad basada en stock y descuento
    let priority = 0.7; // Prioridad base
    if (producto.stock > 0 && producto.descuento && producto.descuento >= 30) {
        priority = 0.9; // Productos con descuento y en stock
    } else if (producto.stock > 0 && producto.descuento) {
        priority = 0.8; // Productos con descuento
    } else if (producto.stock > 0) {
        priority = 0.7; // Productos en stock
    } else {
        priority = 0.4; // Productos agotados
    }
    
    // Añadir entrada del producto
    sitemap += `
  <!-- Producto: ${producto.nombre} -->
  <url>
    <loc>${DOMAIN}/productos/${urlProducto}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>`;
    
    // Añadir imágenes al sitemap (mejora el SEO de imágenes)
    if (imagenesArray.length > 0) {
        imagenesArray.slice(0, 5).forEach(img => {
            if (img && img.trim()) {
                // ✅ ESCAPAR CARACTERES ESPECIALES PARA XML
                const tituloSeguro = producto.nombre.replace(/&/g, '&amp;').replace(/°/g, '&deg;');
                const captionSeguro = producto.descripcion.substring(0, 100).replace(/&/g, '&amp;').replace(/°/g, '&deg;');
                
                sitemap += `
    <image:image>
      <image:loc>${img.trim()}?format=webp&quality=80</image:loc>
      <image:title>${tituloSeguro}</image:title>
      <image:caption>${captionSeguro}</image:caption>
    </image:image>`;
                productosConImagenes++;
            }
        });
    }
    
    sitemap += `
  </url>`;
    
    // Mostrar progreso cada 20 productos
    if ((index + 1) % 20 === 0 || (index + 1) === productos.length) {
        console.log(`   ✅ Productos procesados: ${index + 1}/${productos.length}`);
    }
});

// ============================================
// CERRAR SITEMAP
// ============================================
sitemap += `
</urlset>`;

// ============================================
// GUARDAR ARCHIVO
// ============================================
fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
console.log(`\n✅ sitemap.xml guardado en: ${SITEMAP_PATH}`);

// ============================================
// VERIFICAR CONTENIDO
// ============================================
const fileSize = fs.statSync(SITEMAP_PATH).size;
const fileSizeKB = (fileSize / 1024).toFixed(2);

// ============================================
// VALIDACIÓN BÁSICA DEL SITEMAP
// ============================================
let errores = [];
if (!sitemap.includes('</urlset>')) {
    errores.push('❌ El sitemap no tiene el cierre correcto');
}
if (!sitemap.includes('<urlset')) {
    errores.push('❌ El sitemap no tiene la etiqueta de apertura correcta');
}
if (productos.length > 0 && !sitemap.includes('/productos/')) {
    errores.push('❌ No se encontraron productos en el sitemap');
}
if (categoriasPrincipales.length > 0 && !sitemap.includes('/categorias/')) {
    errores.push('❌ No se encontraron categorías en el sitemap');
}

// ============================================
// RESUMEN FINAL
// ============================================
console.log('\n' + '='.repeat(60));
console.log(`📊 RESUMEN DEL SITEMAP:`);
console.log(`   🌐 URL base: ${DOMAIN}`);
console.log(`   📄 Página principal: 1`);
console.log(`   📁 Categorías: ${categoriasPrincipales.length}`);
console.log(`   🎁 Productos: ${productos.length}`);
console.log(`   🖼️ Imágenes incluidas: ${productosConImagenes}`);
console.log(`   💾 Tamaño del archivo: ${fileSizeKB} KB`);
console.log(`   📍 Ubicación: ${SITEMAP_PATH}`);
console.log('='.repeat(60));

// ============================================
// MOSTRAR ERRORES SI LOS HAY
// ============================================
if (errores.length > 0) {
    console.log('\n⚠️ ADVERTENCIAS:');
    errores.forEach(err => console.log(`   ${err}`));
}

// ============================================
// MOSTRAR EJEMPLO DEL SITEMAP
// ============================================
if (productos.length > 0) {
    const primerProducto = productos[0];
    const primerUrl = generarUrlProducto(primerProducto.nombre, primerProducto.id);
    console.log('\n📌 Ejemplo de entrada en el sitemap:');
    console.log(`   <url>
     <loc>${DOMAIN}/productos/${primerUrl}.html</loc>
     <lastmod>${today}</lastmod>
     <priority>0.7</priority>
   </url>`);
}

// ============================================
// INSTRUCCIONES PARA GOOGLE SEARCH CONSOLE
// ============================================
console.log('\n📌 INSTRUCCIONES PARA GOOGLE SEARCH CONSOLE:');
console.log(`   1. Ve a: https://search.google.com/search-console/`);
console.log(`   2. Añade tu propiedad: ${DOMAIN}`);
console.log(`   3. Verifica tu dominio (método recomendado: registro DNS)`);
console.log(`   4. Ve a "Sitemaps" en el menú lateral`);
console.log(`   5. Introduce: sitemap.xml`);
console.log(`   6. Haz clic en "Enviar"`);
console.log('\n📌 Verificar que el sitemap es accesible:');
console.log(`   ${DOMAIN}/sitemap.xml`);

// ============================================
// CREAR robots.txt SI NO EXISTE
// ============================================
const ROBOTS_PATH = path.join(__dirname, '../robots.txt');
if (!fs.existsSync(ROBOTS_PATH)) {
    const robotsTxt = `# robots.txt para AME Figures
# Permite a todos los robots acceder al sitio
User-agent: *
Allow: /

# Sitemap location
Sitemap: ${DOMAIN}/sitemap.xml

# Rutas a excluir (por si acaso)
Disallow: /js/
Disallow: /css/
Disallow: /images/
`;
    fs.writeFileSync(ROBOTS_PATH, robotsTxt, 'utf8');
    console.log('\n✅ robots.txt creado automáticamente');
} else {
    // Verificar que el robots.txt tenga el sitemap
    const robotsContent = fs.readFileSync(ROBOTS_PATH, 'utf8');
    if (!robotsContent.includes('sitemap.xml')) {
        console.log('\n⚠️ Tu robots.txt no incluye la referencia al sitemap. Añade:');
        console.log(`   Sitemap: ${DOMAIN}/sitemap.xml`);
    } else {
        console.log('\n✅ robots.txt ya existe y contiene referencia al sitemap');
    }
}

console.log('\n🎉 ¡Sitemap generado exitosamente!');