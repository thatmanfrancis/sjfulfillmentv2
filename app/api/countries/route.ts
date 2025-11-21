import { NextResponse } from 'next/server';

// Cache for countries data to avoid repeated API calls
let cachedCountries: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchCountriesFromAPI() {
  try {
    // Use REST Countries API - free and comprehensive
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag,idd,region,subregion');
    
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    
    const countriesData = await response.json();
    
    // Transform the data to our format
    const countries = countriesData.map((country: any) => ({
      code: country.cca2,
      name: country.name.common,
      flag: country.flag,
      phoneCode: country.idd?.root ? 
        country.idd.root + (country.idd.suffixes?.[0] || '') : 
        '+1', // fallback
      region: country.region,
      subregion: country.subregion
    }))
    .filter((country: any) => country.phoneCode !== '+1' || country.code === 'US' || country.code === 'CA')
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    // Fallback to basic countries if API fails
    return [
      { code: 'US', name: 'United States', flag: '🇺🇸', phoneCode: '+1', region: 'Americas' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneCode: '+1', region: 'Americas' },
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234', region: 'Africa' },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44', region: 'Europe' }
    ];
  }
}

async function fetchStatesForCountry(countryCode: string) {
  try {
    // Use different APIs based on country for state/province data
    const stateAPIs: Record<string, string> = {
      'US': 'https://api.census.gov/data/2019/pep/charagegroups?get=NAME&for=state:*',
      'CA': 'https://api.census.gov/data/2019/pep/charagegroups?get=NAME&for=state:*', // Would need Canadian equivalent
      'NG': '', // Would need Nigerian states API
      'GB': '' // Would need UK regions API
    };

    // For now, return predefined states for major countries
    const statesData: Record<string, any[]> = {
      'US': [
        { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
        { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
        { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
        { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
        { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
        { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
        { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
        { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
        { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
        { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
        { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
        { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
        { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
        { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
        { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
        { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
        { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
      ],
      'CA': [
        { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' },
        { code: 'MB', name: 'Manitoba' }, { code: 'NB', name: 'New Brunswick' },
        { code: 'NL', name: 'Newfoundland and Labrador' }, { code: 'NS', name: 'Nova Scotia' },
        { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
        { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' },
        { code: 'NT', name: 'Northwest Territories' }, { code: 'NU', name: 'Nunavut' },
        { code: 'YT', name: 'Yukon' }
      ],
      'NG': [
        { code: 'AB', name: 'Abia' }, { code: 'AD', name: 'Adamawa' },
        { code: 'AK', name: 'Akwa Ibom' }, { code: 'AN', name: 'Anambra' },
        { code: 'BA', name: 'Bauchi' }, { code: 'BY', name: 'Bayelsa' },
        { code: 'BE', name: 'Benue' }, { code: 'BO', name: 'Borno' },
        { code: 'CR', name: 'Cross River' }, { code: 'DE', name: 'Delta' },
        { code: 'EB', name: 'Ebonyi' }, { code: 'ED', name: 'Edo' },
        { code: 'EK', name: 'Ekiti' }, { code: 'EN', name: 'Enugu' },
        { code: 'FC', name: 'Federal Capital Territory' }, { code: 'GO', name: 'Gombe' },
        { code: 'IM', name: 'Imo' }, { code: 'JI', name: 'Jigawa' },
        { code: 'KD', name: 'Kaduna' }, { code: 'KN', name: 'Kano' },
        { code: 'KT', name: 'Katsina' }, { code: 'KE', name: 'Kebbi' },
        { code: 'KO', name: 'Kogi' }, { code: 'KW', name: 'Kwara' },
        { code: 'LA', name: 'Lagos' }, { code: 'NA', name: 'Nasarawa' },
        { code: 'NI', name: 'Niger' }, { code: 'OG', name: 'Ogun' },
        { code: 'ON', name: 'Ondo' }, { code: 'OS', name: 'Osun' },
        { code: 'OY', name: 'Oyo' }, { code: 'PL', name: 'Plateau' },
        { code: 'RI', name: 'Rivers' }, { code: 'SO', name: 'Sokoto' },
        { code: 'TA', name: 'Taraba' }, { code: 'YO', name: 'Yobe' },
        { code: 'ZA', name: 'Zamfara' }
      ],
      'GB': [
        { code: 'ENG', name: 'England' }, { code: 'SCT', name: 'Scotland' },
        { code: 'WLS', name: 'Wales' }, { code: 'NIR', name: 'Northern Ireland' }
      ]
    };

    return statesData[countryCode] || [];
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get('states');

  try {
    // If requesting states for a specific country
    if (countryCode) {
      const states = await fetchStatesForCountry(countryCode);
      return NextResponse.json({ states });
    }

    // Check cache first
    const now = Date.now();
    if (cachedCountries && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({ countries: cachedCountries });
    }

    // Fetch fresh data
    const countries = await fetchCountriesFromAPI();
    
    // Update cache
    cachedCountries = countries;
    cacheTimestamp = now;

    return NextResponse.json({ 
      countries,
      cached: false,
      source: 'REST Countries API'
    });
  } catch (error) {
    console.error('Countries API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries data' },
      { status: 500 }
    );
  }
}