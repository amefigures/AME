// generate-pages.js
// Generador de páginas de productos para AME Figures
// Ejecutar con: node js/generate-pages.js

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN
// ============================================
const DOMAIN = 'https://amefigures.github.io/AME';
const PRODUCTOS_JS_PATH = path.join(__dirname, 'productos.js');
const TEMPLATE_PATH = path.join(__dirname, '../producto.html');  // ← Lee el archivo externo
const OUTPUT_DIR = path.join(__dirname, '../productos/');

// ============================================
// CREAR CARPETA DE SALIDA
// ============================================
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📁 Carpeta "productos" creada');
}

// ============================================
// LEER PRODUCTOS.JS
// ============================================
console.log('📖 Leyendo productos.js...');
const productosContent = fs.readFileSync(PRODUCTOS_JS_PATH, 'utf8');

const productosMatch = productosContent.match(/const productos = (\[[\s\S]*?\]);/);
if (!productosMatch) {
    console.error('❌ No se pudo encontrar el array de productos');
    process.exit(1);
}

const productos = eval(`(${productosMatch[1]})`);
console.log(`✅ Encontrados ${productos.length} productos`);

// ============================================
// LEER PLANTILLA PRODUCTO.HTML
// ============================================
console.log('📖 Leyendo plantilla producto.html...');
const plantilla = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// ============================================
// FUNCIÓN PARA GENERAR URL AMIGABLE
// ============================================
function generarUrlAmigable(nombre, id) {
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
// FUNCIÓN PARA GENERAR TÍTULO SEO
// ============================================
function generarTituloSEO(producto) {
    const anime = producto.nombre.split(' - ')[0] || producto.categoriaPadre || producto.categoria;
    let titulo = producto.nombre;
    
    if (!producto.nombre.toLowerCase().includes('figura') && 
        !producto.nombre.toLowerCase().includes('set') &&
        !producto.nombre.toLowerCase().includes('lámpara')) {
        titulo = `${producto.nombre} - Figura Coleccionable`;
    }
    
    if (producto.tamaño && producto.tamaño !== '-' && producto.tamaño !== 'Variable') {
        titulo += ` ${producto.tamaño}`;
    }
    
    titulo += ` | ${anime} | AME Figures | Envíos a Perú`;
    
    if (titulo.length > 75) {
        titulo = titulo.substring(0, 72) + '...';
    }
    return titulo;
}

// ============================================
// FUNCIÓN PARA GENERAR META DESCRIPTION
// ============================================
function generarMetaDescription(producto) {
    const anime = producto.nombre.split(' - ')[0] || producto.categoriaPadre || producto.categoria;
    let descripcion = `Compra ${producto.nombre}`;
    
    if (!producto.nombre.toLowerCase().includes('figura') && 
        !producto.nombre.toLowerCase().includes('set')) {
        descripcion += ` - Figura coleccionable de ${anime}`;
    }
    
    if (producto.tamaño && producto.tamaño !== '-' && producto.tamaño !== 'Variable') {
        descripcion += ` de ${producto.tamaño}`;
    }
    
    descripcion += `. ${producto.descripcion.substring(0, 100)}`;
    descripcion += ` Precio: S/ ${producto.precioOferta}. Envíos a Perú.`;
    
    if (descripcion.length > 160) {
        descripcion = descripcion.substring(0, 157) + '...';
    }
    return descripcion;
}

// ============================================
// FUNCIÓN PARA GENERAR KEYWORDS
// ============================================
function generarKeywords(producto) {
    const anime = producto.nombre.split(' - ')[0] || producto.categoriaPadre || producto.categoria;
    let keywords = [
        producto.nombre.toLowerCase(),
        `${anime} figuras`,
        `comprar ${producto.nombre.toLowerCase()}`,
        `figura ${anime.toLowerCase()} perú`,
        `AME Figures`
    ];
    
    if (producto.palabrasClave) {
        const extras = producto.palabrasClave.split(',').map(k => k.trim().toLowerCase());
        keywords.push(...extras);
    }
    
    keywords = [...new Set(keywords)];
    return keywords.slice(0, 20).join(', ');
}

// ============================================
// FUNCIÓN PARA FORMATEAR JSON (schema.org)
// ============================================
function formatearJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/\\u[\dA-F]{4}/gi, function(match) {
            return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
        });
}

// ============================================
// FUNCIÓN PARA GENERAR GALERÍA DE IMÁGENES
// ============================================
function generarGaleria(imagenes, nombre) {
    if (!imagenes || imagenes.length === 0) {
        return `<div class="gallery-thumb active"><img src="https://via.placeholder.com/500x500/ff6b00/ffffff?text=AME+Figures" alt="${nombre}"></div>`;
    }
    
    let html = '';
    imagenes.forEach((img, idx) => {
        const imgUrl = img.trim();
        if (imgUrl) {
            html += `
            <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="cambiarImagenPrincipal('${imgUrl}?format=webp&quality=80', this)">
                <img src="${imgUrl}?format=webp&quality=80" alt="${nombre} - Vista ${idx + 1}" loading="lazy">
            </div>`;
        }
    });
    return html;
}

// ============================================
// FUNCIÓN PARA GENERAR OPEN GRAPH TAGS
// ============================================
function generarOGTags(producto, urlAmigable, primeraImagen) {
    return `
    <meta property="og:url" content="${DOMAIN}/productos/${urlAmigable}.html">
    <meta property="og:title" content="${producto.nombre} | AME Figures">
    <meta property="og:description" content="${producto.descripcion.substring(0, 150)}">
    <meta property="og:image" content="${primeraImagen}">
    <meta property="og:type" content="product">
    <meta property="product:price:amount" content="${producto.precioOferta}">
    <meta property="product:price:currency" content="PEN">`;
}

// ============================================
// FUNCIÓN PARA GENERAR SCHEMA DATA
// ============================================
function generarSchemaData(producto, urlAmigable, imagenesArray, primeraImagen, stock) {
    return {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": producto.nombre,
        "image": imagenesArray.length > 0 ? imagenesArray.map(img => img + '?format=webp&quality=80') : [primeraImagen],
        "description": producto.descripcion.substring(0, 200),
        "sku": producto.sku,
        "mpn": producto.id,
        "brand": {
            "@type": "Brand",
            "name": "AME Figures"
        },
        "offers": {
            "@type": "Offer",
            "url": `${DOMAIN}/productos/${urlAmigable}.html`,
            "priceCurrency": "PEN",
            "price": producto.precioOferta,
            "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            "availability": stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };
}

// ============================================
// GENERAR PÁGINAS PARA CADA PRODUCTO
// ============================================
console.log('\n🔄 Generando páginas de productos...\n');

let generadas = 0;
let errores = 0;

productos.forEach((producto, index) => {
    try {
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        
        // Procesar imágenes
        let imagenesArray = [];
        if (typeof producto.imagenes === 'string' && producto.imagenes.trim()) {
            imagenesArray = producto.imagenes.split(',').map(url => url.trim()).filter(url => url);
        } else if (Array.isArray(producto.imagenes)) {
            imagenesArray = producto.imagenes;
        }
        
        const primeraImagen = imagenesArray.length > 0 ? imagenesArray[0] : 'https://via.placeholder.com/500x500/ff6b00/ffffff?text=AME+Figures';
        
        // Calcular variables
        const tituloSEO = generarTituloSEO(producto);
        const metaDescription = generarMetaDescription(producto);
        const keywordsSEO = generarKeywords(producto);
        const galeriaHTML = generarGaleria(imagenesArray, producto.nombre);
        const ogTags = generarOGTags(producto, urlAmigable, primeraImagen);
        const stock = parseInt(producto.stock) || 0;
        const stockPorcentaje = Math.min(100, (stock / 10) * 100);
        const stockColor = stock > 0 ? '#4caf50' : '#ff3333';
        const stockTexto = stock > 0 ? '✅ En stock' : '❌ Agotado';
        const botonDisabled = stock === 0 ? 'disabled' : '';
        const botonTexto = stock === 0 ? 'Agotado' : 'Añadir al carrito';
        const ahorro = producto.precioInflado ? (producto.precioInflado - producto.precioOferta).toFixed(2) : 0;
        const categoriaPadre = producto.categoriaPadre || producto.categoria;
        const categoriaUrl = categoriaPadre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ñ]/g, "n").replace(/\s+/g, '-');
        const schemaData = generarSchemaData(producto, urlAmigable, imagenesArray, primeraImagen, stock);
        
        // Reemplazar placeholders en la plantilla
        let html = plantilla
            .replace(/{{TITULO}}/g, tituloSEO)
            .replace(/{{DESCRIPCION}}/g, metaDescription)
            .replace(/{{PALABRAS_CLAVE}}/g, keywordsSEO)
            .replace(/{{URL_AMIGABLE}}/g, urlAmigable)
            .replace(/{{OG_TAGS}}/g, ogTags)
            .replace(/{{SCHEMA_DATA}}/g, formatearJSON(schemaData))
            .replace(/{{PRODUCTO_NOMBRE}}/g, producto.nombre)
            .replace(/{{PRODUCTO_ID}}/g, producto.id)
            .replace(/{{PRODUCTO_TAMAÑO}}/g, producto.tamaño || 'Estándar')
            .replace(/{{PRECIO_OFERTA}}/g, producto.precioOferta.toFixed(2))
            .replace(/{{PRECIO_INFLADO}}/g, producto.precioInflado.toFixed(2))
            .replace(/{{DESCUENTO}}/g, producto.descuento)
            .replace(/{{STOCK}}/g, stock)
            .replace(/{{STOCK_PORCENTAJE}}/g, stockPorcentaje)
            .replace(/{{STOCK_COLOR}}/g, stockColor)
            .replace(/{{STOCK_TEXTO}}/g, stockTexto)
            .replace(/{{BOTON_DISABLED}}/g, botonDisabled)
            .replace(/{{BOTON_TEXTO}}/g, botonTexto)
            .replace(/{{CATEGORIA}}/g, categoriaPadre)
            .replace(/{{PRIMERA_IMAGEN}}/g, primeraImagen)
            .replace(/{{GALERIA_HTML}}/g, galeriaHTML)
            .replace(/{{ES_SET_DISPLAY}}/g, producto.esSet ? 'flex' : 'none')
            .replace(/{{ahorro > 0 ? 'block' : 'none'}}/g, ahorro > 0 ? 'block' : 'none');
        
        const rutaArchivo = path.join(OUTPUT_DIR, `${urlAmigable}.html`);
        fs.writeFileSync(rutaArchivo, html, 'utf8');
        
        console.log(`   ✅ [${index + 1}/${productos.length}] ${producto.nombre}`);
        generadas++;
    } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre}:`, error.message);
        errores++;
    }
});

// ============================================
// RESUMEN FINAL
// ============================================
console.log('\n' + '='.repeat(60));
console.log(`📊 RESUMEN DE GENERACIÓN:`);
console.log(`   ✅ Páginas generadas: ${generadas}`);
console.log(`   ❌ Errores: ${errores}`);
console.log(`   📁 Ubicación: ${path.resolve(OUTPUT_DIR)}`);
console.log('='.repeat(60));

if (generadas > 0) {
    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('\n📌 Ejemplo de página generada:');
    const primerProducto = productos[0];
    const primerUrl = generarUrlAmigable(primerProducto.nombre, primerProducto.id);
    console.log(`   ${DOMAIN}/productos/${primerUrl}.html`);
} else {
    console.log('\n❌ No se generó ninguna página. Revisa los errores.');
}