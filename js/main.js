// ============================================
// MAIN.JS - VERSIÓN CORREGIDA PARA NUEVA ESTRUCTURA
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    WHATSAPP_NUMBER: '51922511532',
    CURRENCY: 'S/ ',
    STORAGE_KEY: 'ameFiguresCart',
    RECENTLY_VIEWED_KEY: 'ameRecentlyViewed',
    FREE_SHIPPING_MIN: 100,
    BASE_URL: 'https://amefigures.github.io/AME/'  // ← CAMBIADO
};

// ============================================
// FUNCIÓN PARA OPTIMIZAR URLs DE CLOUDINARY
// ============================================
function optimizarUrlCloudinary(url) {
    if (url && url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
        return url.replace('/upload/', '/upload/q_auto,f_auto/');
    }
    return url;
}

// ============================================
// ESTADO GLOBAL
// ============================================
let estado = {
    carrito: [],
    productosFiltrados: [],
    categoriaActiva: 'todos',
    busquedaActiva: '',
    productosRecientes: []
};

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
// OBTENER CATEGORÍA PADRE (para productos unificados)
// ============================================
function obtenerCategoriaPadre(producto) {
    return producto.categoriaPadre || producto.categoria;
}

// ============================================
// OBTENER CATEGORÍAS ÚNICAS (usando categoriaPadre)
// ============================================
function obtenerCategoriasUnicas() {
    const categorias = new Set();
    categorias.add('todos');
    productos.forEach(p => {
        const cat = obtenerCategoriaPadre(p);
        if (cat) categorias.add(cat);
    });
    return Array.from(categorias).sort();
}

// ============================================
// OBTENER PRODUCTOS POR CATEGORÍA PADRE
// ============================================
function obtenerProductosPorCategoriaPadre(categoria) {
    if (categoria === 'todos') return productos;
    return productos.filter(p => obtenerCategoriaPadre(p) === categoria);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando AME Figures...');
    
    if (typeof productos === 'undefined') {
        console.error('❌ Error: productos.js no está cargado');
        return;
    }
    
    // Procesar imágenes
    productos.forEach(p => {
        if (typeof p.imagenes === 'string' && p.imagenes.trim()) {
            p.imagenes = p.imagenes.split(',').map(url => url.trim()).filter(url => url);
        } else if (!p.imagenes) {
            p.imagenes = [];
        }
    });
    
    cargarProductosRecientes();
    
    const productosOrdenados = [...productos].sort((a, b) => {
        if (a.esSet && !b.esSet) return -1;
        if (!a.esSet && b.esSet) return 1;
        return b.descuento - a.descuento;
    });
    
    estado.productosFiltrados = productosOrdenados;
    
    // Inicializar todo
    cargarCarrito();
    generarCategoriasUnicas();
    generarCategoriasDestacadas();
    renderizarProductos();
    actualizarContadorCarrito();
    actualizarContadorProductos();
    actualizarCartPreview();
    mostrarProductosRecientes();
    
    // Event listeners
    initEventListeners();
    
    // CAPTURAR BÚSQUEDA DESDE URL
    capturarBusquedaDesdeURL();

    // Inicializar AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 600,
            once: true,
            offset: 50,
            disable: window.innerWidth < 768
        });
    }

    // Inicializar Swiper
    setTimeout(() => {
        if (typeof Swiper !== 'undefined') {
            new Swiper('.hero-swiper', {
                loop: true,
                autoplay: { delay: 5000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
            });
            
            new Swiper('.categories-swiper', {
                slidesPerView: 2,
                spaceBetween: 15,
                loop: true,
                autoplay: { delay: 3000, disableOnInteraction: false },
                navigation: { 
                    nextEl: '.categories-swiper .swiper-button-next', 
                    prevEl: '.categories-swiper .swiper-button-prev' 
                },
                breakpoints: {
                    640: { slidesPerView: 3 },
                    768: { slidesPerView: 4 },
                    1024: { slidesPerView: 5 }
                }
            });
        }
    }, 100);

    // Ocultar loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
    }, 800);
    
    console.log('✅ Inicialización completa. Productos cargados:', productos.length);
    verificarCategorias(); // Debug
});

// ============================================
// VERIFICAR CATEGORÍAS (DEBUG ACTUALIZADO)
// ============================================
function verificarCategorias() {
    console.log('=== VERIFICACIÓN DE CATEGORÍAS (NUEVA ESTRUCTURA) ===');
    const categorias = obtenerCategoriasUnicas();
    console.log('📌 Categorías principales:', categorias);
    
    // Contar productos por categoría padre
    console.log('\n📊 Conteo por categoría:');
    categorias.forEach(cat => {
        if (cat !== 'todos') {
            const count = productos.filter(p => obtenerCategoriaPadre(p) === cat).length;
            console.log(`   ${cat}: ${count} productos`);
        }
    });
    
    // Verificar subcategorías
    console.log('\n📂 Subcategorías detectadas:');
    const subcategorias = new Set();
    productos.forEach(p => {
        if (p.subcategoria && p.subcategoria !== 'General') {
            subcategorias.add(`${obtenerCategoriaPadre(p)} → ${p.subcategoria}`);
        }
    });
    subcategorias.forEach(s => console.log(`   📁 ${s}`));
}

// ============================================
// INICIALIZAR EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('input', window.searchHandler);
        
        window.searchHandler = function() {
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                const term = this.value.toLowerCase().trim();
                
                if (window.location.pathname.includes('productos/')) {
                    if (term.length > 0) {
                        window.location.href = `../index.html?search=${encodeURIComponent(term)}`;
                    } else {
                        window.location.href = `../index.html`;
                    }
                } else {
                    estado.busquedaActiva = term;
                    aplicarFiltros();
                }
            }, 300);
        };
        
        searchInput.addEventListener('input', window.searchHandler);
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = searchInput.value.toLowerCase().trim();
                
                if (window.location.pathname.includes('productos/')) {
                    if (term.length > 0) {
                        window.location.href = `../index.html?search=${encodeURIComponent(term)}`;
                    } else {
                        window.location.href = `../index.html`;
                    }
                } else {
                    estado.busquedaActiva = term;
                    aplicarFiltros();
                }
            }
        });
    }
    
    // Ordenamiento
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => ordenarProductos(e.target.value));
    }
    
    // Scroll
    window.addEventListener('scroll', () => {
        const scrollTop = document.getElementById('scrollTop');
        if (scrollTop) {
            scrollTop.classList.toggle('visible', window.scrollY > 300);
        }
    }, { passive: true });
}

// ============================================
// GENERAR CATEGORÍAS ÚNICAS (ACTUALIZADO)
// ============================================
function generarCategoriasUnicas() {
    const categorias = obtenerCategoriasUnicas();
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${cat === 'todos' ? 'active' : ''}`;
        btn.setAttribute('data-category', cat);
        
        const icono = cat === 'todos' ? 'fa-star' : 'fa-tag';
        let nombre = cat === 'todos' ? 'Todos' : cat;
        
        // Corregir nombre de Pokémon
        if (nombre === 'Pokemon') nombre = 'Pokémon';
        
        btn.innerHTML = `<i class="fas ${icono}"></i> ${nombre}`;
        btn.onclick = () => filtrarPorCategoria(cat);
        
        container.appendChild(btn);
    });
}

// ============================================
// GENERAR CATEGORÍAS DESTACADAS (ACTUALIZADO)
// ============================================
function generarCategoriasDestacadas() {
    const grid = document.getElementById('featuredCategoriesGrid');
    if (!grid) return;
    
    // Categorías destacadas actualizadas (sin subcategorías)
    const categoriasDestacadas = [
        'Dragon Ball',
        'One Piece',
        'Pokemon',
        'Demon Slayer',
        'Marvel',
        'DC',
        'Naruto'
    ];
    
    const imagenesPorCategoria = {};
    productos.forEach(p => {
        const catPadre = obtenerCategoriaPadre(p);
        if (!imagenesPorCategoria[catPadre] && p.imagenes && p.imagenes[0]) {
            imagenesPorCategoria[catPadre] = p.imagenes[0];
        }
    });
    
    grid.innerHTML = categoriasDestacadas.map(cat => {
        const catNombre = cat === 'Pokemon' ? 'Pokemon' : cat;
        const existe = productos.some(p => obtenerCategoriaPadre(p) === catNombre);
        if (!existe) return '';
        
        const imagen = imagenesPorCategoria[catNombre] || 'https://via.placeholder.com/300x300/ff6b00/ffffff?text=' + encodeURIComponent(cat);
        const catMostrar = cat === 'Pokemon' ? 'Pokémon' : cat;
        
        return `
        <div class="swiper-slide">
            <div class="category-card" onclick="filtrarPorCategoria('${catNombre}')">
                <img src="${imagen}" alt="${catMostrar}" loading="lazy">
                <div class="category-overlay">
                    <h3>${catMostrar}</h3>
                    <span class="category-btn-small">Ver <i class="fas fa-chevron-right"></i></span>
                </div>
            </div>
        </div>
    `}).join('');
}

// ============================================
// FILTRAR POR CATEGORÍA (ACTUALIZADO)
// ============================================
function filtrarPorCategoria(categoria) {
    console.log('🎯 Filtrando por categoría:', categoria);
    
    estado.categoriaActiva = categoria;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        const btnCat = btn.getAttribute('data-category');
        btn.classList.toggle('active', btnCat === categoria);
    });
    
    aplicarFiltros();
    
    document.querySelector('.products-section')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// ============================================
// APLICAR FILTROS (ACTUALIZADO)
// ============================================
function aplicarFiltros() {
    console.log('🔍 Aplicando filtros - Categoría:', estado.categoriaActiva, 'Búsqueda:', estado.busquedaActiva);
    
    let filtrados = [...productos];
    
    // FILTRO POR CATEGORÍA (usando categoriaPadre)
    if (estado.categoriaActiva && estado.categoriaActiva !== 'todos') {
        filtrados = filtrados.filter(p => obtenerCategoriaPadre(p) === estado.categoriaActiva);
        console.log(`📊 Total en categoría "${estado.categoriaActiva}": ${filtrados.length} productos`);
    }
    
    // FILTRO POR BÚSQUEDA
    if (estado.busquedaActiva && estado.busquedaActiva !== '') {
        const busqueda = estado.busquedaActiva.toLowerCase();
        filtrados = filtrados.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) ||
            (obtenerCategoriaPadre(p) && obtenerCategoriaPadre(p).toLowerCase().includes(busqueda)) ||
            (p.sku && p.sku.toLowerCase().includes(busqueda)) ||
            (p.palabrasClave && p.palabrasClave.toLowerCase().includes(busqueda))
        );
    }
    
    estado.productosFiltrados = filtrados;
    renderizarProductos();
    actualizarContadorProductos();
    
    if (filtrados.length === 0) {
        mostrarToast(`No se encontraron productos`, 'info');
    }
}

// ============================================
// ORDENAR PRODUCTOS
// ============================================
function ordenarProductos(tipo) {
    switch(tipo) {
        case 'menor-precio':
            estado.productosFiltrados.sort((a, b) => a.precioOferta - b.precioOferta);
            break;
        case 'mayor-precio':
            estado.productosFiltrados.sort((a, b) => b.precioOferta - a.precioOferta);
            break;
        case 'nombre':
            estado.productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        default:
            estado.productosFiltrados.sort((a, b) => {
                if (a.esSet && !b.esSet) return -1;
                if (!a.esSet && b.esSet) return 1;
                return b.descuento - a.descuento;
            });
    }
    renderizarProductos();
}

// ============================================
// RENDERIZAR PRODUCTOS (ACTUALIZADO)
// ============================================
function renderizarProductos() {
    const grid = document.getElementById('productsGrid');
    const productsCount = document.getElementById('productsCount');
    
    if (!grid) return;
    
    if (estado.productosFiltrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: rgba(255,107,0,0.05); border-radius: 30px; border: 2px dashed rgba(255,107,0,0.3);">
                <i class="fas fa-search" style="font-size: 60px; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="color: white; font-size: 24px; margin-bottom: 10px;">No se encontraron productos</h3>
                <p style="color: #888;">Intenta con otra búsqueda o categoría</p>
            </div>
        `;
        if (productsCount) productsCount.textContent = '0 productos';
        return;
    }
    
    grid.innerHTML = estado.productosFiltrados.map(producto => {
        const imagenesArray = producto.imagenes || [];
        const totalImagenes = imagenesArray.length;
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        
        const tieneEnvioGratis = producto.precioOferta >= CONFIG.FREE_SHIPPING_MIN;
        const stockPorcentaje = Math.min(100, (producto.stock / 10) * 100);
        
        // Badge de tipo según subcategoria
        let tipoBadge = '';
        if (producto.esSet) {
            tipoBadge = '<span class="badge set"><i class="fas fa-cubes"></i> SET</span>';
        } else if (producto.subcategoria === 'Vehículos') {
            tipoBadge = '<span class="badge vehiculo"><i class="fas fa-car"></i> VEHÍCULO</span>';
        } else if (producto.subcategoria === 'Lámparas') {
            tipoBadge = '<span class="badge lampara"><i class="fas fa-lightbulb"></i> LÁMPARA</span>';
        }
        
        const imagenesHTML = imagenesArray.map((img, index) => {
            return `<img src="${img}" 
                         loading="lazy"
                         alt="${producto.nombre}"
                         class="${index === 0 ? 'active' : ''}"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300/ff6b00/ffffff?text=AME'">`;
        }).join('');
        
        return `
        <div class="product-card" data-id="${producto.id}">
            <div class="product-badges">
                ${tipoBadge}
                <span class="badge discount">-${producto.descuento}%</span>
                ${tieneEnvioGratis ? '<span class="badge free-shipping"><i class="fas fa-truck"></i> ENVÍO GRATIS</span>' : ''}
            </div>
            
            <div class="product-image" onclick="window.location.href='productos/${urlAmigable}.html'">
                <div class="image-container">
                    ${imagenesHTML}
                </div>
                ${totalImagenes > 1 ? '<span class="multi-image-badge"><i class="fas fa-images"></i> ' + totalImagenes + '</span>' : ''}
                
                <div class="quick-view-overlay">
                    <button class="quick-view-btn" onclick="event.stopPropagation(); verImagenes('${producto.id}')">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
            </div>
            
            <div class="product-info">
                <h3 class="product-title" onclick="window.location.href='productos/${urlAmigable}.html'" style="cursor: pointer;">${producto.nombre}</h3>
                
                <div class="stock-progress">
                    <div class="stock-bar">
                        <div class="stock-fill" style="width: ${stockPorcentaje}%"></div>
                    </div>
                    <span class="stock-text">
                        <i class="fas fa-box"></i> ${producto.stock} und.
                    </span>
                </div>
                
                <div class="price-wrapper">
                    <span class="offer-price">${CONFIG.CURRENCY}${producto.precioOferta.toFixed(2)}</span>
                    <span class="inflated-price">${CONFIG.CURRENCY}${producto.precioInflado.toFixed(2)}</span>
                    <span class="discount-tag">-${producto.descuento}%</span>
                </div>
                
                <div class="product-actions">
                    <button class="btn-add" onclick="agregarAlCarrito('${producto.id}')" title="Añadir al carrito">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="btn-whatsapp" onclick="enviarWhatsAppProducto('${producto.id}')" title="Consultar por WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn-quick-buy" onclick="compraRapida('${producto.id}')" title="Comprar ahora">
                        <i class="fas fa-bolt"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
    
    if (productsCount) productsCount.textContent = `${estado.productosFiltrados.length} productos`;
    
    setTimeout(() => {
        iniciarCarruselImagenes();
    }, 100);
}

// ============================================
// FUNCIONES DE OFERTAS Y NOVEDADES
// ============================================
function verOfertas() {
    const ofertas = productos.filter(p => p.descuento >= 20);
    estado.productosFiltrados = ofertas;
    estado.categoriaActiva = 'ofertas';
    estado.busquedaActiva = '';
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    renderizarProductos();
    actualizarContadorProductos();
    document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
    mostrarToast(`🔥 ${ofertas.length} productos en oferta`, 'success');
}

function verNovedades() {
    const novedades = productos.slice(0, 20);
    estado.productosFiltrados = novedades;
    estado.categoriaActiva = 'novedades';
    estado.busquedaActiva = '';
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    renderizarProductos();
    actualizarContadorProductos();
    document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
    mostrarToast(`✨ ${novedades.length} novedades`, 'success');
}

// ============================================
// COMPRA RÁPIDA
// ============================================
function compraRapida(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    agregarAlCarrito(id);
    
    setTimeout(() => {
        toggleCart();
    }, 300);
}

// ============================================
// PRODUCTOS VISTOS RECIENTEMENTE
// ============================================
function agregarProductoReciente(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    let recientes = JSON.parse(localStorage.getItem(CONFIG.RECENTLY_VIEWED_KEY) || '[]');
    recientes = recientes.filter(id => id !== productoId);
    recientes.unshift(productoId);
    recientes = recientes.slice(0, 6);
    
    localStorage.setItem(CONFIG.RECENTLY_VIEWED_KEY, JSON.stringify(recientes));
    mostrarProductosRecientes();
}

function cargarProductosRecientes() {
    const recientes = JSON.parse(localStorage.getItem(CONFIG.RECENTLY_VIEWED_KEY) || '[]');
    estado.productosRecientes = recientes;
}

function mostrarProductosRecientes() {
    const section = document.getElementById('recentlyViewedSection');
    const grid = document.getElementById('recentlyViewedGrid');
    
    if (!section || !grid) return;
    
    const recientes = JSON.parse(localStorage.getItem(CONFIG.RECENTLY_VIEWED_KEY) || '[]');
    
    if (recientes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    const productosRecientes = recientes
        .map(id => productos.find(p => p.id === id))
        .filter(p => p);
    
    if (productosRecientes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    grid.innerHTML = productosRecientes.map(producto => {
        const imagen = producto.imagenes && producto.imagenes[0] 
            ? producto.imagenes[0] 
            : 'https://via.placeholder.com/100x100/ff6b00/ffffff?text=AME';
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        
        return `
            <div class="recent-item" onclick="window.location.href='productos/${urlAmigable}.html'">
                <img src="${imagen}" alt="${producto.nombre}" loading="lazy">
                <div class="recent-title">${producto.nombre}</div>
            </div>
        `;
    }).join('');
    
    section.style.display = 'block';
}

// ============================================
// VER MÚLTIPLES IMÁGENES
// ============================================
function verImagenes(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    agregarProductoReciente(productoId);
    
    const imagenes = producto.imagenes || [];
    if (imagenes.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin imágenes',
            text: 'Este producto no tiene imágenes disponibles.',
            background: '#1a1a1a',
            color: 'white',
            confirmButtonColor: '#ff6b00'
        });
        return;
    }
    
    let currentIndex = 0;
    
    const showImage = () => {
        const imageUrl = imagenes[currentIndex];
        const total = imagenes.length;
        
        Swal.fire({
            imageUrl: imageUrl,
            imageAlt: producto.nombre,
            title: `${producto.nombre} ${total > 1 ? `(${currentIndex + 1}/${total})` : ''}`,
            background: '#1a1a1a',
            color: 'white',
            confirmButtonColor: '#ff6b00',
            showCloseButton: true,
            showConfirmButton: false,
            showDenyButton: total > 1,
            showCancelButton: total > 1,
            denyButtonText: '<i class="fas fa-chevron-left"></i> Anterior',
            cancelButtonText: '<i class="fas fa-chevron-right"></i> Siguiente',
            cancelButtonColor: '#ff6b00',
            denyButtonColor: '#ff6b00',
            width: '90%',
            padding: '20px',
            customClass: {
                image: 'swal-image-zoom'
            }
        }).then((result) => {
            if (result.isDenied) {
                currentIndex = (currentIndex - 1 + total) % total;
                showImage();
            } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                currentIndex = (currentIndex + 1) % total;
                showImage();
            }
        });
    };
    
    showImage();
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const itemExistente = estado.carrito.find(item => item.id === id);
    
    if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
            mostrarToast('¡Stock insuficiente!', 'error');
            return;
        }
        itemExistente.cantidad++;
        mostrarToast(`+1 ${producto.nombre}`, 'success');
    } else {
        estado.carrito.push({ ...producto, cantidad: 1 });
        mostrarToast(`✓ ${producto.nombre} añadido`, 'success');
    }
    
    guardarCarrito();
    actualizarContadorCarrito();
    actualizarCarritoModal();
    actualizarCartPreview();
}

function eliminarDelCarrito(id) {
    const index = estado.carrito.findIndex(item => item.id === id);
    if (index !== -1) {
        const producto = estado.carrito[index];
        estado.carrito.splice(index, 1);
        guardarCarrito();
        actualizarContadorCarrito();
        actualizarCarritoModal();
        actualizarCartPreview();
        mostrarToast(`✗ ${producto.nombre} eliminado`, 'info');
    }
}

function actualizarCantidad(id, delta) {
    const item = estado.carrito.find(item => item.id === id);
    if (!item) return;
    
    const nuevaCantidad = item.cantidad + delta;
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }
    
    if (nuevaCantidad > item.stock) {
        mostrarToast('Stock insuficiente', 'error');
        return;
    }
    
    item.cantidad = nuevaCantidad;
    guardarCarrito();
    actualizarContadorCarrito();
    actualizarCarritoModal();
    actualizarCartPreview();
}

function vaciarCarrito() {
    if (estado.carrito.length === 0) return;
    
    Swal.fire({
        title: '¿Vaciar carrito?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff6b00',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        background: '#1a1a1a',
        color: 'white'
    }).then((result) => {
        if (result.isConfirmed) {
            estado.carrito = [];
            guardarCarrito();
            actualizarContadorCarrito();
            actualizarCarritoModal();
            actualizarCartPreview();
            mostrarToast('Carrito vaciado', 'success');
        }
    });
}

function calcularTotal() {
    return estado.carrito.reduce((sum, item) => sum + (item.precioOferta * item.cantidad), 0);
}

// ============================================
// FUNCIONES DE WHATSAPP
// ============================================

function enviarWhatsAppProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const mensaje = `*¡Hola! Me interesa esta figura* 👋\n\n` +
        `🎯 *${producto.nombre}*\n` +
        `🔖 *Código:* ${producto.sku}\n` +
        `📏 *Tamaño:* ${producto.tamaño || 'Estándar'}\n` +
        `💰 *Precio:* S/ ${producto.precioOferta.toFixed(2)}\n` +
        `🏷️ *Regular:* S/ ${producto.precioInflado.toFixed(2)} (-${producto.descuento}%)\n\n` +
        `📦 *¿Tienen disponible?*\n` +
        `Quedo atento, ¡gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function sendOrderWhatsApp() {
    if (estado.carrito.length === 0) {
        mostrarToast('El carrito está vacío', 'error');
        return;
    }
    
    const total = calcularTotal();
    
    let mensaje = '*¡Hola! Quiero completar mi pedido* 🛒\n\n';
    mensaje += '─────────────────────\n';
    mensaje += '*MIS FIGURAS:*\n';
    mensaje += '─────────────────────\n\n';
    
    estado.carrito.forEach((item, index) => {
        mensaje += `🎯 *${item.nombre}*\n`;
        mensaje += `   🔢 Cantidad: ${item.cantidad}\n`;
        mensaje += `   💰 Precio: S/ ${item.precioOferta.toFixed(2)}\n`;
        mensaje += `   📦 Subtotal: S/ ${(item.precioOferta * item.cantidad).toFixed(2)}\n\n`;
    });
    
    mensaje += '─────────────────────\n';
    mensaje += `💰 *TOTAL: S/ ${total.toFixed(2)}*\n`;
    mensaje += '─────────────────────\n\n';
    
    mensaje += '*📍 DATOS PARA EL ENVÍO:*\n';
    mensaje += '👤 *Nombre:*\n';
    mensaje += '📞 *Teléfono:*\n';
    mensaje += '🏠 *Dirección:*\n';
    mensaje += '🏙️ *Ciudad:*\n\n';
    
    mensaje += '✨ *¡Gracias! Quedo atento.*';
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
    toggleCart();
}

function enviarWhatsAppFlotante() {
    const mensaje = `*¡Hola AME Figures!* 👋\n\n` +
        `Estuve viendo su web y me gustaría consultar por algunas figuras.\n\n` +
        `✨ *Mi consulta:*\n` +
        `¿Podrían ayudarme? ¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function verOfertasWhatsApp() {
    const mensaje = `*¡Hola!* 👋 Vi que tienen ofertas en la web.\n\n` +
        `🎁 ¿Qué figuras están en promoción?\n` +
        `💰 ¿Hasta cuándo?\n\n` +
        `¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function verNovedadesWhatsApp() {
    const mensaje = `*¡Hola!* 👋 Quería consultar por las novedades.\n\n` +
        `✨ ¿Qué figuras nuevas llegaron?\n` +
        `🎯 ¿Qué me recomiendan?\n\n` +
        `¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function contactoWhatsApp() {
    const mensaje = `*¡Hola AME Figures!* 👋\n\n` +
        `Me gustaría contactarlos para:\n\n` +
        `💬 *Mi consulta:*\n\n` +
        `¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function consultarProductoWhatsApp(sku, nombre, precio) {
    const mensaje = `*¡Hola! Me interesa esta figura* 👋\n\n` +
        `🎯 *${nombre}*\n` +
        `🔖 *Código:* ${sku}\n` +
        `💰 *Precio:* S/ ${precio}\n\n` +
        `📦 *¿Tienen disponible?*\n` +
        `📍 *Mi ciudad:*\n\n` +
        `¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function compraRapidaWhatsApp(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const mensaje = `*¡Hola! Ya decidí, quiero esta figura* ⚡\n\n` +
        `🎯 *${producto.nombre}*\n` +
        `🔖 *Código:* ${producto.sku}\n` +
        `💰 *Precio:* S/ ${producto.precioOferta.toFixed(2)}\n\n` +
        `📦 *¿Me confirmas disponibilidad y envío?*\n` +
        `📍 *Mi ciudad:*\n\n` +
        `¡Gracias! 😊`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ============================================
// FUNCIONES DEL CARRITO MODAL
// ============================================
function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.toggle('active');
        document.body.style.overflow = modal.classList.contains('active') ? 'hidden' : 'auto';
        if (modal.classList.contains('active')) actualizarCarritoModal();
    }
}

function actualizarCarritoModal() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems) return;
    
    if (estado.carrito.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Tu carrito está vacío</h3>
                <p>¡Explora nuestro catálogo!</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = `${CONFIG.CURRENCY}0.00`;
        return;
    }
    
    cartItems.innerHTML = estado.carrito.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.nombre}</div>
                    <div class="cart-item-price">${CONFIG.CURRENCY}${item.precioOferta}</div>
                </div>
            </div>
            <div class="cart-item-quantity">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="actualizarCantidad('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.cantidad}</span>
                    <button class="qty-btn" onclick="actualizarCantidad('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                </div>
                <div class="item-total">${CONFIG.CURRENCY}${(item.precioOferta * item.cantidad).toFixed(2)}</div>
                <button class="qty-btn" onclick="eliminarDelCarrito('${item.id}')" style="border-color: #ff3300;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    
    if (cartTotal) cartTotal.textContent = `${CONFIG.CURRENCY}${calcularTotal().toFixed(2)}`;
}

// ============================================
// ACTUALIZAR PREVIEW DEL CARRITO
// ============================================
function actualizarCartPreview() {
    const previewItems = document.getElementById('cartPreviewItems');
    const previewTotal = document.getElementById('cartPreviewTotal');
    
    if (!previewItems || !previewTotal) return;
    
    if (estado.carrito.length === 0) {
        previewItems.innerHTML = '<div style="text-align: center; padding: 20px;">🛒 Carrito vacío</div>';
        previewTotal.textContent = `${CONFIG.CURRENCY}0.00`;
        return;
    }
    
    previewItems.innerHTML = estado.carrito.slice(-3).map(item => {
        const imagen = item.imagenes && item.imagenes[0] 
            ? `<img src="${item.imagenes[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 10px;">`
            : '<i class="fas fa-box"></i>';
        
        return `
        <div class="preview-item">
            <div class="preview-item-image">${imagen}</div>
            <div class="preview-item-info">
                <div class="preview-item-title">${item.nombre.substring(0, 20)}...</div>
                <div class="preview-item-price">${CONFIG.CURRENCY}${item.precioOferta}</div>
            </div>
            <div class="preview-item-quantity">x${item.cantidad}</div>
        </div>
    `}).join('');
    
    previewTotal.textContent = `${CONFIG.CURRENCY}${calcularTotal().toFixed(2)}`;
}

// ============================================
// LOCALSTORAGE
// ============================================
function guardarCarrito() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(estado.carrito));
}

function cargarCarrito() {
    const carritoGuardado = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (carritoGuardado) {
        try {
            estado.carrito = JSON.parse(carritoGuardado);
        } catch (e) {
            estado.carrito = [];
        }
    }
}

// ============================================
// ACTUALIZACIONES DE UI
// ============================================
function actualizarContadorCarrito() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const total = estado.carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCount.textContent = total;
        
        cartCount.style.transform = 'scale(1.2)';
        cartCount.style.transition = 'transform 0.15s ease';
        setTimeout(() => {
            cartCount.style.transform = 'scale(1)';
        }, 150);
    }
}

function actualizarContadorProductos() {
    const countElem = document.getElementById('productsCount');
    if (countElem) countElem.textContent = `${estado.productosFiltrados.length} productos`;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    let icono = 'fa-info-circle';
    if (tipo === 'success') icono = 'fa-check-circle';
    if (tipo === 'error') icono = 'fa-exclamation-circle';
    
    toast.innerHTML = `<i class="fas ${icono}"></i><span>${mensaje}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s ease';
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}

// ============================================
// EFECTO DE IMÁGENES CON DESVANECIMIENTO
// ============================================
function iniciarCarruselImagenes() {
    document.querySelectorAll('.product-card').forEach(card => {
        const images = card.querySelectorAll('.product-image img');
        if (images.length <= 1) return;
        
        let currentIndex = 0;
        images[0].classList.add('active');
        
        setInterval(() => {
            images[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].classList.add('active');
        }, 3000);
    });
}

// ============================================
// EFECTO PARALLAX
// ============================================
function initParallaxEffects() {
    const heroSlides = document.querySelectorAll('.hero-swiper .swiper-slide');
    
    heroSlides.forEach(slide => {
        if (!slide.querySelector('.parallax-bg')) {
            const bgImage = slide.style.backgroundImage.replace(/.*\s?url\(['"]?/, '').replace(/['"]?\).*/, '');
            const parallaxBg = document.createElement('div');
            parallaxBg.className = 'parallax-bg';
            parallaxBg.style.backgroundImage = `url(${bgImage})`;
            slide.insertBefore(parallaxBg, slide.firstChild);
            slide.style.backgroundImage = 'none';
        }
    });

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const parallaxElements = document.querySelectorAll('.hero-swiper .parallax-bg, .wa-parallax-bg');
        
        parallaxElements.forEach(element => {
            const speed = element.classList.contains('wa-parallax-bg') ? 0.5 : 0.3;
            const yPos = scrolled * speed;
            element.style.transform = `translate3d(0, ${yPos}px, 0) scale(1.2)`;
        });
    });
}

// ============================================
// CORREGIR TILDE DE POKÉMON EN LA INTERFAZ
// ============================================
function corregirPokemonUI() {
    const elementos = [
        ...document.querySelectorAll('.category-btn'),
        ...document.querySelectorAll('.section-header h2'),
        ...document.querySelectorAll('.product-category'),
        ...document.querySelectorAll('.testimonial-author span')
    ];
    
    elementos.forEach(el => {
        if (el.textContent.includes('Pokemon') && !el.textContent.includes('Pokémon')) {
            el.innerHTML = el.innerHTML.replace(/Pokemon/g, 'Pokémon');
        }
    });
}

// ============================================
// CAPTURAR BÚSQUEDA DESDE URL
// ============================================
function capturarBusquedaDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    
    if (searchTerm) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = decodeURIComponent(searchTerm);
            estado.busquedaActiva = decodeURIComponent(searchTerm).toLowerCase().trim();
            
            if (typeof productos !== 'undefined') {
                aplicarFiltros();
            } else {
                const checkProductos = setInterval(() => {
                    if (typeof productos !== 'undefined') {
                        clearInterval(checkProductos);
                        aplicarFiltros();
                    }
                }, 100);
            }
        }
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================
window.filtrarPorCategoria = filtrarPorCategoria;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.actualizarCantidad = actualizarCantidad;
window.vaciarCarrito = vaciarCarrito;
window.toggleCart = toggleCart;
window.enviarWhatsAppProducto = enviarWhatsAppProducto;
window.sendOrderWhatsApp = sendOrderWhatsApp;
window.verImagenes = verImagenes;
window.verOfertas = verOfertas;
window.verNovedades = verNovedades;
window.compraRapida = compraRapida;
window.enviarWhatsAppFlotante = enviarWhatsAppFlotante;
window.verOfertasWhatsApp = verOfertasWhatsApp;
window.verNovedadesWhatsApp = verNovedadesWhatsApp;
window.contactoWhatsApp = contactoWhatsApp;
window.consultarProductoWhatsApp = consultarProductoWhatsApp;
window.compraRapidaWhatsApp = compraRapidaWhatsApp;

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', () => {
    corregirPokemonUI();
    initParallaxEffects();
});

setTimeout(corregirPokemonUI, 500);
setTimeout(corregirPokemonUI, 1000);