import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApiService } from '../../src/services/adminApiService';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, headers: new Headers() } as unknown as Response;
}

describe('adminApiService (fetch)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('google_auth_token', 'admin-token');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const parsed = new URL(url as string);
    return { path: parsed.pathname, query: parsed.searchParams, init: init as RequestInit };
  };

  describe('autenticación', () => {
    it.each([
      ['getGroups', () => adminApiService.getGroups()],
      ['listUsers', () => adminApiService.listUsers()],
      ['getUserSessions', () => adminApiService.getUserSessions(1)],
      ['uploadCsv', () => adminApiService.uploadCsv(new File(['a'], 'a.csv'))],
      ['exportUsers', () => adminApiService.exportUsers()],
      ['exportUserSessions', () => adminApiService.exportUserSessions(1)],
    ])('%s falla sin token y no llama a la red', async (_name, call) => {
      localStorage.clear();

      await expect(call()).rejects.toThrow('No hay token de autenticación');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('envía el token como Bearer', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await adminApiService.getGroups();

      expect((lastCall().init.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
    });
  });

  describe('getGroups', () => {
    it('hace GET /admin/groups y devuelve el cuerpo', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: ['10A', '11A'] }));

      const result = await adminApiService.getGroups();

      expect(lastCall().path.endsWith('/admin/groups')).toBe(true);
      expect(lastCall().init.method).toBe('GET');
      expect(result).toEqual({ data: ['10A', '11A'] });
    });

    it('lanza el error del servidor', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'Sin permisos' }, false, 403));

      await expect(adminApiService.getGroups()).rejects.toThrow('Sin permisos');
    });

    it('usa un mensaje por defecto si el servidor no da error', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

      await expect(adminApiService.getGroups()).rejects.toThrow('Error al obtener grupos');
    });

    it('(comportamiento actual) si el error no es JSON, p. ej. HTML de PHP, lanza SyntaxError y pierde el mensaje por defecto', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => JSON.parse('<html>Internal Server Error</html>'),
        headers: new Headers(),
      } as unknown as Response);

      await expect(adminApiService.getGroups()).rejects.toBeInstanceOf(SyntaxError);
    });
  });

  describe('listUsers', () => {
    it('sin filtros no agrega query string', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await adminApiService.listUsers();

      expect(lastCall().path.endsWith('/admin/users')).toBe(true);
      expect([...lastCall().query.keys()]).toEqual([]);
    });

    it('serializa filtros y orden', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await adminApiService.listUsers({
        page: 2,
        per_page: 14,
        sort_by: 'email',
        order: 'asc',
        group: '10A',
        search: 'maria',
      });

      const q = lastCall().query;
      expect(q.get('page')).toBe('2');
      expect(q.get('per_page')).toBe('14');
      expect(q.get('sort_by')).toBe('email');
      expect(q.get('order')).toBe('asc');
      expect(q.get('group')).toBe('10A');
      expect(q.get('search')).toBe('maria');
    });

    it('omite parámetros undefined, null o vacíos pero conserva el 0', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await adminApiService.listUsers({
        group: '',
        search: undefined,
        profile: null as unknown as string,
        min_score: 0,
      });

      const q = lastCall().query;
      expect(q.has('group')).toBe(false);
      expect(q.has('search')).toBe(false);
      expect(q.has('profile')).toBe(false);
      expect(q.get('min_score')).toBe('0');
    });

    it('lanza el error del servidor o un mensaje por defecto', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Prohibido' }, false, 403));
      await expect(adminApiService.listUsers()).rejects.toThrow('Prohibido');

      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));
      await expect(adminApiService.listUsers()).rejects.toThrow('Error al obtener usuarios');
    });
  });

  describe('getUserSessions', () => {
    it('hace GET /admin/users/{id}/sessions con filtros', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await adminApiService.getUserSessions(42, { page: 3, date_from: '2026-01-01' });

      expect(lastCall().path.endsWith('/admin/users/42/sessions')).toBe(true);
      expect(lastCall().query.get('page')).toBe('3');
      expect(lastCall().query.get('date_from')).toBe('2026-01-01');
    });

    it('lanza un mensaje por defecto si falla', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

      await expect(adminApiService.getUserSessions(1)).rejects.toThrow('Error al obtener sesiones del usuario');
    });
  });

  describe('uploadCsv', () => {
    it('hace POST multipart a /admin/users/upload-csv', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, stats: { created: 2 } }));
      const file = new File(['email,group\na@b.co,10A'], 'usuarios.csv', { type: 'text/csv' });

      const result = await adminApiService.uploadCsv(file);

      const { path, init } = lastCall();
      expect(path.endsWith('/admin/users/upload-csv')).toBe(true);
      expect(init.method).toBe('POST');
      expect((init.body as FormData).get('file')).toBeInstanceOf(File);
      expect(result).toEqual({ success: true, stats: { created: 2 } });
    });

    it('no fija Content-Type (lo calcula el navegador con el boundary)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await adminApiService.uploadCsv(new File(['x'], 'x.csv'));

      expect(Object.keys(lastCall().init.headers as object)).toEqual(['Authorization']);
    });

    it('combina error y mensaje del servidor cuando ambos existen', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'CSV inválido', message: 'Falta la columna group' }, false, 422));

      await expect(adminApiService.uploadCsv(new File(['x'], 'x.csv'))).rejects.toThrow(
        'CSV inválido: Falta la columna group'
      );
    });

    it('usa solo el error, o un mensaje por defecto', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Archivo muy grande' }, false, 422));
      await expect(adminApiService.uploadCsv(new File(['x'], 'x.csv'))).rejects.toThrow('Archivo muy grande');

      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));
      await expect(adminApiService.uploadCsv(new File(['x'], 'x.csv'))).rejects.toThrow('Error al cargar CSV');
    });
  });

  describe('exportaciones', () => {
    function stubDownload() {
      const createObjectURL = vi.fn(() => 'blob:fake');
      const revokeObjectURL = vi.fn();
      Object.assign(window.URL, { createObjectURL, revokeObjectURL });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      return { createObjectURL, revokeObjectURL, click };
    }

    function csvResponse(contentDisposition?: string): Response {
      const headers = new Headers();
      if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob(['a,b']),
        headers,
      } as unknown as Response;
    }

    it('exportUsers descarga el archivo con el nombre del servidor y limpia el DOM', async () => {
      const { createObjectURL, revokeObjectURL, click } = stubDownload();
      fetchMock.mockResolvedValue(csvResponse('attachment; filename="usuarios_2026.csv"'));
      let downloadName = '';
      click.mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

      await adminApiService.exportUsers({ group: '10A' });

      expect(lastCall().path.endsWith('/admin/export/users')).toBe(true);
      expect(lastCall().query.get('group')).toBe('10A');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(click).toHaveBeenCalledOnce();
      expect(downloadName).toBe('usuarios_2026.csv');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
      expect(document.querySelector('a[download]')).toBeNull();
    });

    it('exportUsers usa "usuarios.csv" si el servidor no indica nombre', async () => {
      const { click } = stubDownload();
      fetchMock.mockResolvedValue(csvResponse());
      let downloadName = '';
      click.mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

      await adminApiService.exportUsers();

      expect(downloadName).toBe('usuarios.csv');
    });

    it('exportUserSessions usa su ruta y "sesiones.csv" por defecto', async () => {
      const { click } = stubDownload();
      fetchMock.mockResolvedValue(csvResponse());
      let downloadName = '';
      click.mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

      await adminApiService.exportUserSessions(42, { date_from: '2026-01-01' });

      expect(lastCall().path.endsWith('/admin/export/users/42/sessions')).toBe(true);
      expect(lastCall().query.get('date_from')).toBe('2026-01-01');
      expect(downloadName).toBe('sesiones.csv');
    });

    it('lanza un error claro si la exportación falla', async () => {
      stubDownload();
      fetchMock.mockResolvedValue({ ok: false, status: 500, headers: new Headers() } as unknown as Response);
      await expect(adminApiService.exportUsers()).rejects.toThrow('Error al exportar usuarios');

      fetchMock.mockResolvedValue({ ok: false, status: 500, headers: new Headers() } as unknown as Response);
      await expect(adminApiService.exportUserSessions(1)).rejects.toThrow('Error al exportar sesiones');
    });
  });
});
