// generate-pages.js
// Generador de páginas de productos para AME Figures - VERSIÓN SEO OPTIMIZADA
// Ejecutar con: node generate-pages.js

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN
// ============================================
const DOMAIN = 'https://amefigures.github.io/AME';
const PRODUCTOS_JS_PATH = path.join(__dirname, 'productos.js');
const TEMPLATE_PATH = '../producto.html';
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
// FUNCIÓN PARA GENERAR TÍTULO SEO OPTIMIZADO
// ============================================
function generarTituloSEO(producto) {
    const anime = producto.nombre.split(' - ')[0] || producto.categoriaPadre || producto.categoria;
    
    let titulo = producto.nombre;
    
    // Añadir "Figura Coleccionable" si aplica
    if (!producto.nombre.toLowerCase().includes('figura') && 
        !producto.nombre.toLowerCase().includes('set') &&
        !producto.nombre.toLowerCase().includes('lámpara') &&
        !producto.nombre.toLowerCase().includes('barco') &&
        !producto.nombre.toLowerCase().includes('nave')) {
        titulo = `${producto.nombre} - Figura Coleccionable`;
    }
    
    // Añadir tamaño
    if (producto.tamaño && producto.tamaño !== '-' && producto.tamaño !== 'Variable') {
        titulo += ` ${producto.tamaño}`;
    }
    
    // Añadir palabras clave SEO
    titulo += ` | ${anime} | AME Figures | Envíos a Perú`;
    
    // Limitar a 70-75 caracteres (óptimo para Google)
    if (titulo.length > 75) {
        titulo = titulo.substring(0, 72) + '...';
    }
    
    return titulo;
}

// ============================================
// FUNCIÓN PARA GENERAR META DESCRIPTION OPTIMIZADA
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
    descripcion += ` Precio: S/ ${producto.precioOferta}. Envíos a todo Perú.`;
    
    // Limitar a 155-160 caracteres
    if (descripcion.length > 160) {
        descripcion = descripcion.substring(0, 157) + '...';
    }
    
    return descripcion;
}

// ============================================
// FUNCIÓN PARA GENERAR KEYWORDS OPTIMIZADAS
// ============================================
function generarKeywords(producto) {
    const anime = producto.nombre.split(' - ')[0] || producto.categoriaPadre || producto.categoria;
    const personaje = producto.nombre.split(' - ')[1] || producto.nombre;
    
    let keywords = [
        producto.nombre.toLowerCase(),
        `${anime} figuras`,
        `${personaje} figura`,
        `comprar ${producto.nombre.toLowerCase()}`,
        `figura ${anime.toLowerCase()} perú`,
        `tienda anime perú`,
        `coleccionables ${anime.toLowerCase()}`,
        `figuras de anime`,
        `AME Figures`,
        `figuras coleccionables perú`
    ];
    
    // Añadir palabras clave específicas del producto
    if (producto.palabrasClave) {
        const extras = producto.palabrasClave.split(',').map(k => k.trim().toLowerCase());
        keywords.push(...extras);
    }
    
    // Eliminar duplicados
    keywords = [...new Set(keywords)];
    
    // Limitar a 20 keywords para no spam
    if (keywords.length > 20) {
        keywords = keywords.slice(0, 20);
    }
    
    return keywords.join(', ');
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
// GENERAR PÁGINA HTML DEL PRODUCTO
// ============================================
function generarPaginaProducto(producto, urlAmigable) {
    // Procesar imágenes
    let imagenesArray = [];
    if (typeof producto.imagenes === 'string' && producto.imagenes.trim()) {
        imagenesArray = producto.imagenes.split(',').map(url => url.trim()).filter(url => url);
    } else if (Array.isArray(producto.imagenes)) {
        imagenesArray = producto.imagenes;
    }
    
    const primeraImagen = imagenesArray.length > 0 ? imagenesArray[0] : 'https://via.placeholder.com/500x500/ff6b00/ffffff?text=AME+Figures';
    
    // SEO OPTIMIZADO
    const tituloSEO = generarTituloSEO(producto);
    const metaDescription = generarMetaDescription(producto);
    const keywordsSEO = generarKeywords(producto);
    const galeriaHTML = generarGaleria(imagenesArray, producto.nombre);
    
    // Stock
    const stock = parseInt(producto.stock) || 0;
    const stockPorcentaje = Math.min(100, (stock / 10) * 100);
    const stockColor = stock > 0 ? '#4caf50' : '#ff3333';
    const stockTexto = stock > 0 ? '✅ En stock' : '❌ Agotado';
    const botonDisabled = stock === 0 ? 'disabled' : '';
    const botonTexto = stock === 0 ? 'Agotado' : 'Añadir al carrito';
    
    // Ahorro
    const ahorro = producto.precioInflado ? (producto.precioInflado - producto.precioOferta).toFixed(2) : 0;
    
    // Categorías para breadcrumbs
    const categoriaPadre = producto.categoriaPadre || producto.categoria;
    const categoriaUrl = categoriaPadre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ñ]/g, "n").replace(/\s+/g, '-');
    
    // Schema.org
    const schemaData = {
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
            "itemCondition": "https://schema.org/NewCondition",
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": "0",
                    "currency": "PEN"
                },
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "PE"
                }
            }
        }
    };
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    
    <!-- TÍTULO OPTIMIZADO PARA SEO -->
    <title>${tituloSEO}</title>
    
    <!-- META DESCRIPTION OPTIMIZADA -->
    <meta name="description" content="${metaDescription.replace(/"/g, '&quot;')}">
    
    <!-- KEYWORDS OPTIMIZADAS -->
    <meta name="keywords" content="${keywordsSEO}">
    
    <meta name="author" content="AME Figures">
    <meta name="robots" content="index, follow">
    <meta name="googlebot" content="index, follow">
    <link rel="canonical" href="${DOMAIN}/productos/${urlAmigable}.html">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:url" content="${DOMAIN}/productos/${urlAmigable}.html">
    <meta property="og:title" content="${producto.nombre} | ${categoriaPadre}">
    <meta property="og:description" content="${producto.descripcion.substring(0, 150)}... Precio: S/ ${producto.precioOferta}">
    <meta property="og:image" content="${primeraImagen}?format=webp&quality=80">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="800">
    <meta property="og:site_name" content="AME Figures">
    <meta property="product:price:amount" content="${producto.precioOferta}">
    <meta property="product:price:currency" content="PEN">
    <meta property="product:availability" content="${stock > 0 ? 'in stock' : 'out of stock'}">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${producto.nombre} | AME Figures">
    <meta name="twitter:description" content="${producto.descripcion.substring(0, 150)}">
    <meta name="twitter:image" content="${primeraImagen}?format=webp&quality=80">
    
    <!-- Schema.org structured data -->
    <script type="application/ld+json">
    ${formatearJSON(schemaData)}
    </script>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90' fill='%23ff6b00'>🐉</text></svg>">
    
    <!-- Google Fonts & CSS -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../css/estilo.css">
    
    <style>
        /* Reset y estilos base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
        }
        
        /* Efectos de fondo */
        .noise {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            z-index: -1;
        }
        
        .gradient-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 20% 50%, rgba(255,107,0,0.08) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
        }
        
        /* Header */
        .main-header {
            background: rgba(10, 10, 20, 0.95);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 1000;
            padding: 15px 5%;
            border-bottom: 1px solid rgba(255,107,0,0.3);
        }
        
        .header-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        
        .logo-icon {
            width: 45px;
            height: 45px;
            background: linear-gradient(135deg, #ff6b00, #ff8c33);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        
        .logo-text h1 {
            font-size: 1.3rem;
            letter-spacing: 2px;
            background: linear-gradient(135deg, #fff, #ffcc88);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .logo-text p {
            font-size: 0.7rem;
            color: #ff8c33;
        }
        
        .cart-button {
            background: rgba(255,107,0,0.2);
            border: 1px solid rgba(255,107,0,0.5);
            border-radius: 50px;
            padding: 10px 20px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }
        
        .cart-button:hover {
            background: rgba(255,107,0,0.4);
        }
        
        .cart-count {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Breadcrumbs */
        .breadcrumbs {
            padding: 20px 5%;
            max-width: 1400px;
            margin: 0 auto;
            font-size: 0.85rem;
            color: #aaa;
        }
        
        .breadcrumbs a {
            color: #ff8c33;
            text-decoration: none;
        }
        
        .breadcrumbs a:hover {
            text-decoration: underline;
        }
        
        /* Product Container */
        .product-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px 5% 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
        }
        
        @media (max-width: 768px) {
            .product-container {
                grid-template-columns: 1fr;
                gap: 30px;
            }
        }
        
        /* Galería */
        .product-gallery {
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            padding: 20px;
        }
        
        .main-image {
            width: 100%;
            aspect-ratio: 1;
            object-fit: contain;
            border-radius: 15px;
            background: rgba(0,0,0,0.3);
            margin-bottom: 20px;
        }
        
        .thumbnails {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .gallery-thumb {
            width: 80px;
            height: 80px;
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s;
            background: rgba(0,0,0,0.3);
        }
        
        .gallery-thumb.active {
            border-color: #ff6b00;
        }
        
        .gallery-thumb:hover {
            transform: scale(1.05);
        }
        
        .gallery-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Info Producto */
        .product-info h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #fff, #ffcc88);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .categoria-badge {
            display: inline-block;
            background: rgba(255,107,0,0.2);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            color: #ff8c33;
            margin-bottom: 20px;
        }
        
        .precios {
            display: flex;
            align-items: baseline;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .precio-oferta {
            font-size: 2.5rem;
            font-weight: 800;
            color: #ff6b00;
        }
        
        .precio-antiguo {
            font-size: 1.2rem;
            text-decoration: line-through;
            color: #888;
        }
        
        .descuento-badge {
            background: #ff4444;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
        }
        
        .ahorro {
            background: rgba(76,175,80,0.2);
            padding: 8px 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        
        .descripcion {
            line-height: 1.6;
            color: #ccc;
            margin-bottom: 25px;
        }
        
        .detalles {
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .detalle-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .detalle-item:last-child {
            border-bottom: none;
        }
        
        .stock-bar {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            height: 8px;
            margin: 10px 0;
            overflow: hidden;
        }
        
        .stock-fill {
            width: ${stockPorcentaje}%;
            height: 100%;
            background: ${stockColor};
            border-radius: 10px;
            transition: width 0.5s;
        }
        
        .stock-texto {
            font-size: 0.85rem;
            color: ${stockColor};
            font-weight: 500;
        }
        
        .btn-add-cart {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #ff6b00, #ff8c33);
            border: none;
            border-radius: 50px;
            color: white;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
            margin-bottom: 15px;
        }
        
        .btn-add-cart:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(255,107,0,0.4);
        }
        
        .btn-add-cart:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-back {
            display: inline-block;
            background: rgba(255,255,255,0.1);
            padding: 12px 25px;
            border-radius: 50px;
            color: white;
            text-decoration: none;
            transition: background 0.3s;
        }
        
        .btn-back:hover {
            background: rgba(255,255,255,0.2);
        }
        
        /* Footer */
        .main-footer {
            background: rgba(0,0,0,0.8);
            padding: 40px 5% 20px;
            margin-top: 60px;
        }
        
        .footer-container {
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }
        
        .footer-section h4 {
            margin-bottom: 15px;
            color: #ff8c33;
        }
        
        .footer-section ul {
            list-style: none;
        }
        
        .footer-section ul li {
            margin-bottom: 8px;
        }
        
        .footer-section a {
            color: #aaa;
            text-decoration: none;
        }
        
        .footer-section a:hover {
            color: #ff8c33;
        }
        
        .footer-bottom {
            text-align: center;
            padding-top: 30px;
            margin-top: 30px;
            border-top: 1px solid rgba(255,255,255,0.1);
            font-size: 0.8rem;
            color: #666;
        }
        
        /* WhatsApp Float */
        .whatsapp-float {
            position: fixed;
            bottom: 30px;
            left: 30px;
            background: #25D366;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: white;
            text-decoration: none;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 100;
            transition: transform 0.3s;
        }
        
        .whatsapp-float:hover {
            transform: scale(1.1);
        }
        
        /* Toast */
        .toast {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Scroll Top */
        .scroll-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 45px;
            height: 45px;
            background: rgba(255,107,0,0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            transition: all 0.3s;
        }
        
        .scroll-top:hover {
            background: #ff6b00;
            transform: translateY(-3px);
        }
    </style>
</head>
<body>
    <div class="noise"></div>
    <div class="gradient-bg"></div>
    
    <!-- Header -->
    <header class="main-header">
        <div class="header-container">
            <div class="logo-wrapper" onclick="window.location.href='../index.html'">
                <div class="logo-icon"><i class="fas fa-dragon"></i></div>
                <div class="logo-text">
                    <h1>AME FIGURES</h1>
                    <p>Colección Premium</p>
                </div>
            </div>
            <div class="cart-wrapper">
                <div class="cart-button" onclick="toggleCart()">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-count" id="cartCount">0</span>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Breadcrumbs -->
    <div class="breadcrumbs">
        <a href="../index.html">Inicio</a> &gt;
        <a href="../categorias/${categoriaUrl}.html">${categoriaPadre}</a> &gt;
        <span>${producto.nombre}</span>
    </div>
    
    <!-- Product Container -->
    <div class="product-container">
        <!-- Galería de imágenes -->
        <div class="product-gallery">
            <img id="mainImage" class="main-image" src="${primeraImagen}?format=webp&quality=80" alt="${producto.nombre} - Figura coleccionable de ${categoriaPadre}">
            <div class="thumbnails" id="thumbnails">
                ${galeriaHTML}
            </div>
        </div>
        
        <!-- Información del producto -->
        <div class="product-info">
            <span class="categoria-badge"><i class="fas fa-tag"></i> ${categoriaPadre}</span>
            <h1>${producto.nombre}</h1>
            
            <div class="precios">
                <span class="precio-oferta">S/ ${producto.precioOferta.toFixed(2)}</span>
                ${producto.precioInflado ? `<span class="precio-antiguo">S/ ${producto.precioInflado.toFixed(2)}</span>` : ''}
                ${producto.descuento ? `<span class="descuento-badge">-${producto.descuento}%</span>` : ''}
            </div>
            
            ${ahorro > 0 ? `<div class="ahorro"><i class="fas fa-tag"></i> ¡Ahorras S/ ${ahorro}!</div>` : ''}
            
            <div class="detalles">
                <div class="detalle-item">
                    <span><i class="fas fa-ruler"></i> Tamaño</span>
                    <span><strong>${producto.tamaño || 'Estándar'}</strong></span>
                </div>
                <div class="detalle-item">
                    <span><i class="fas fa-barcode"></i> SKU</span>
                    <span><strong>${producto.sku}</strong></span>
                </div>
                <div class="detalle-item">
                    <span><i class="fas fa-box"></i> Stock</span>
                    <span><strong class="stock-texto">${stockTexto}</strong></span>
                </div>
            </div>
            
            <div class="stock-bar">
                <div class="stock-fill"></div>
            </div>
            
            <div class="descripcion">
                <p>${producto.descripcion}</p>
            </div>
            
            <button class="btn-add-cart" id="addToCartBtn" data-id="${producto.id}" data-nombre="${producto.nombre.replace(/'/g, "\\'")}" data-precio="${producto.precioOferta}" data-imagen="${primeraImagen}" ${botonDisabled}>
                <i class="fas fa-shopping-cart"></i> ${botonTexto}
            </button>
            
            <a href="../index.html" class="btn-back"><i class="fas fa-arrow-left"></i> Seguir comprando</a>
        </div>
    </div>
    
    <!-- Footer -->
    <footer class="main-footer">
        <div class="footer-container">
            <div class="footer-section">
                <h4>AME FIGURES</h4>
                <p>Tu tienda de figuras coleccionables en Perú. Envíos a todo el país.</p>
            </div>
            <div class="footer-section">
                <h4>Enlaces rápidos</h4>
                <ul>
                    <li><a href="../index.html">Inicio</a></li>
                    <li><a href="../categorias/dragon-ball.html">Dragon Ball</a></li>
                    <li><a href="../categorias/one-piece.html">One Piece</a></li>
                    <li><a href="../categorias/pokemon.html">Pokémon</a></li>
                    <li><a href="../categorias/demon-slayer.html">Demon Slayer</a></li>
                    <li><a href="../categorias/marvel.html">Marvel</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Contacto</h4>
                <ul>
                    <li><i class="fab fa-whatsapp"></i> <a href="https://wa.me/51922511532">+51 922 511 532</a></li>
                    <li><i class="far fa-envelope"></i> amefigures@gmail.com</li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Métodos de pago</h4>
                <ul>
                    <li><i class="fas fa-mobile-alt"></i> Yape</li>
                    <li><i class="fas fa-mobile-alt"></i> Plin</li>
                    <li><i class="fas fa-university"></i> Transferencia bancaria</li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 AME Figures - Hecho en Perú 🇵🇪</p>
        </div>
    </footer>
    
    <!-- WhatsApp Float -->
    <a href="https://wa.me/51922511532?text=Hola%20AME%20Figures%2C%20vi%20la%20figura%20${encodeURIComponent(producto.nombre)}%20en%20su%20web%20y%20estoy%20interesado%20en%20comprarla.%20¿Podrían%20darme%20más%20información%3F" class="whatsapp-float" target="_blank">
        <i class="fab fa-whatsapp"></i>
    </a>
    
    <!-- Scroll Top -->
    <div class="scroll-top" id="scrollTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
        <i class="fas fa-arrow-up"></i>
    </div>
    
    <script>
        // Cambiar imagen principal
        function cambiarImagenPrincipal(src, element) {
            document.getElementById('mainImage').src = src;
            document.querySelectorAll('.gallery-thumb').forEach(thumb => {
                thumb.classList.remove('active');
            });
            element.classList.add('active');
        }
        
        // Carrito
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        function actualizarContadorCarrito() {
            const count = cart.reduce((sum, item) => sum + item.cantidad, 0);
            const cartCountElem = document.getElementById('cartCount');
            if (cartCountElem) cartCountElem.textContent = count;
        }
        
        function agregarAlCarrito(id, nombre, precio, imagen) {
            const existing = cart.find(item => item.id === id);
            if (existing) {
                existing.cantidad++;
            } else {
                cart.push({ id, nombre, precio, imagen, cantidad: 1 });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            actualizarContadorCarrito();
            
            // Mostrar toast
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = '<i class="fas fa-check-circle"></i> ' + nombre + ' añadido al carrito';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
        
        function toggleCart() {
            window.location.href = '../index.html#cart';
        }
        
        // Event listener botón añadir al carrito
        const addBtn = document.getElementById('addToCartBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                if (!this.disabled) {
                    agregarAlCarrito(
                        this.dataset.id,
                        this.dataset.nombre,
                        parseFloat(this.dataset.precio),
                        this.dataset.imagen
                    );
                }
            });
        }
        
        // Mostrar/ocultar scroll top
        window.addEventListener('scroll', function() {
            const scrollTop = document.getElementById('scrollTop');
            if (window.scrollY > 300) {
                scrollTop.style.display = 'flex';
            } else {
                scrollTop.style.display = 'none';
            }
        });
        
        // Inicializar
        actualizarContadorCarrito();
        document.getElementById('scrollTop').style.display = 'none';
        
        // Efecto hover en thumbnails
        document.querySelectorAll('.gallery-thumb').forEach(thumb => {
            thumb.addEventListener('mouseenter', function() {
                const img = this.querySelector('img');
                if (img) {
                    document.getElementById('mainImage').src = img.src;
                }
            });
        });
    </script>
</body>
</html>`;
}

// ============================================
// GENERAR PÁGINAS PARA CADA PRODUCTO
// ============================================
console.log('\n🔄 Generando páginas de productos con SEO optimizado...\n');

let generadas = 0;
let errores = 0;

productos.forEach((producto, index) => {
    try {
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        const html = generarPaginaProducto(producto, urlAmigable);
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
    console.log('\n📌 Siguientes pasos:');
    console.log('   1. Ejecutar node generate-categories.js');
    console.log('   2. Ejecutar node generate-sitemap.js');
    console.log('   3. Subir todo a GitHub');
} else {
    console.log('\n❌ No se generó ninguna página. Revisa los errores.');
}