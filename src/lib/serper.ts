async function callSearchApi(type: string, payload: any) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Search API call failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error(`Search API call failed (${type}):`, error);
    return [];
  }
}

export async function searchJobs(domain: string, country: string, profileType?: string, searchPreferences?: any) {
  return callSearchApi('jobs', { domain, country, profileType, searchPreferences });
}

export async function searchSalaries(role: string, country: string) {
  return callSearchApi('salaries', { role, country });
}

export async function searchInvestors(sector: string, ticketSize: string) {
  return callSearchApi('investors', { sector, ticketSize });
}

export async function searchClients(product: string, targetCustomer: string, country: string) {
  return callSearchApi('clients', { product, targetCustomer, country });
}
