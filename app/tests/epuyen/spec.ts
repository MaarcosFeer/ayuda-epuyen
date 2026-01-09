import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// --- GRUPO 1: PRUEBAS PÚBLICAS (No requieren Login) ---
test.describe('Funcionalidades Públicas', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // 1. Prueba de Autenticación (Estado Inicial)
  test('Debe pedir login al intentar publicar sin sesión', async ({ page }) => {
    // Verificamos que el botón de login existe
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Preparamos el listener para la alerta del navegador
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('iniciar sesión');
      await dialog.accept();
    });

    // Intentamos publicar (si el botón está visible pero gris/bloqueado, Playwright puede intentar hacer click forzado o verificar el estado)
    // Según tu código, el botón existe pero lanza alert.
    await page.getByRole('button', { name: 'Publicar' }).click();
  });

  // 2. Prueba de Navegación (Mapa vs Lista)
  test('Debe alternar entre Mapa y Lista', async ({ page }) => {
    // Por defecto el mapa debe ser visible (buscamos el contenedor de leaflet)
    const mapContainer = page.locator('.leaflet-container').first();
    await expect(mapContainer).toBeVisible();

    // Cambiar a Lista
    await page.getByRole('button', { name: 'Lista' }).click();
    
    // El mapa ya no debe ser visible o debe haber cambiado el DOM
    await expect(mapContainer).not.toBeVisible();
    // Debe aparecer mensaje de vacio o tarjetas
    await expect(page.getByText(/No hay publicaciones|Necesito|Ofrezco/)).toBeVisible();

    // Volver a Mapa
    await page.getByRole('button', { name: 'Mapa' }).click();
    await expect(mapContainer).toBeVisible();
  });

  // 6. Prueba de Filtros Visuales
  test('Debe filtrar visualmente las categorías', async ({ page }) => {
    // Clic en "Necesito"
    await page.getByRole('button', { name: 'Necesito' }).click();
    // Verificar que el botón tiene clase de activo (visualmente distinto)
    await expect(page.getByRole('button', { name: 'Necesito' })).toHaveClass(/bg-red-600/);

    // Clic en "Ofrezco"
    await page.getByRole('button', { name: 'Ofrezco' }).click();
    await expect(page.getByRole('button', { name: 'Ofrezco' })).toHaveClass(/bg-green-600/);
  });
});

// --- GRUPO 2: PRUEBAS PRIVADAS (Requieren Login) ---
// Para que esto funcione, necesitas guardar tu estado de login en 'playwright/.auth/user.json'
// O puedes correr esto usando: npx playwright test --ui y loguearte manualmente la primera vez.
test.describe('Funcionalidades Privadas (Usuario Logueado)', () => {
  
  // Esta línea le dice a Playwright que use la sesión guardada (si existe)
  test.use({ storageState: 'playwright/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // 3. Prueba de Creación de Publicación
  test('Flujo completo: Crear, Verificar Mapa y Borrar', async ({ page }) => {
    // Verificar que estamos logueados (Botón salir visible)
    // Si falla aquí, es que no tienes el archivo auth.json generado
    await expect(page.getByTitle('Cerrar sesión')).toBeVisible();

    // --- A. CREAR ---
    await page.getByRole('button', { name: 'Publicar' }).click();
    
    // Llenar formulario
    await page.locator('input[name="type"][value="necesidad"] + span').click(); // Click en el radio custom "NECESITO"
    await page.getByPlaceholder('Título').fill('TEST AUTOMATIZADO');
    await page.getByPlaceholder('Detalles...').fill('Esta es una prueba generada por Playwright');
    
    // INTERACCIÓN CON EL MAPA DEL FORMULARIO
    // Hacemos clic en el centro del mapa pequeño (LocationPicker)
    // El segundo .leaflet-container suele ser el del modal
    await page.locator('.leaflet-container').last().click({ position: { x: 100, y: 100 } });
    
    // Verificar que apareció la validación
    await expect(page.getByText('✓ Marcado')).toBeVisible();

    await page.getByPlaceholder('Referencia escrita').fill('Calle Falsa 123');
    await page.getByPlaceholder('Teléfono').fill('11223344');

    await page.getByRole('button', { name: 'Confirmar Publicación' }).click();

    // --- B. VERIFICAR EN LISTA Y GEO-REVERSA ---
    // Cambiar a lista para ver lo que creamos
    await page.getByRole('button', { name: 'Lista' }).click();
    
    // Buscar la tarjeta creada
    const card = page.locator('article', { hasText: 'TEST AUTOMATIZADO' }).first(); // O el div contenedor
    // Nota: Como usamos divs genericos, buscamos por texto
    await expect(page.getByText('TEST AUTOMATIZADO')).toBeVisible();

    // --- C. BORRAR (Limpieza) ---
    // Filtramos por "Mis Avisos" para encontrarlo rápido
    await page.getByRole('button', { name: 'Mis Avisos' }).click();
    
    // Manejar el dialogo de confirmación de borrado
    page.on('dialog', dialog => dialog.accept());

    // Clic en Eliminar (buscamos el botón dentro de la tarjeta que tiene nuestro titulo)
    // Usamos xpath o locator chaining para encontrar el botón de borrar al lado del texto
    await page.getByRole('button', { name: 'Eliminar' }).first().click();

    // Verificar que desapareció
    await expect(page.getByText('TEST AUTOMATIZADO')).not.toBeVisible();
  });
});