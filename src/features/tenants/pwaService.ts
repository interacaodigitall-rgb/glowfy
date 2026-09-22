import { TenantProfile } from '../../types';

export function updateDynamicPWAManifest(tenant: TenantProfile) {
  if (!tenant) return;

  const manifestData = {
    name: tenant.name,
    short_name: tenant.name.split(' ')[0],
    description: `App White-Label de Agendamento e Serviços — ${tenant.name}`,
    start_url: `/b/${tenant.slug}`,
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: tenant.primaryColor || '#e11d48',
    icons: [
      {
        src: tenant.logoUrl || '/assets/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: tenant.logoUrl || '/assets/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  const stringManifest = JSON.stringify(manifestData);
  const blob = new Blob([stringManifest], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(blob);

  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }

  manifestLink.href = manifestUrl;

  // Also update theme-color meta tag
  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = tenant.primaryColor || '#e11d48';
}
