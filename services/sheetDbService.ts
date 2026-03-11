
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/9cn1wkkydk8yc';

export const registerUserToSheetDB = async (name: string, email: string) => {
  try {
    const response = await fetch(SHEETDB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          {
            'שם מלא': name,
            'איימיל': email,
            'סוג מנוי': 'Pro'
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SheetDB Error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to register user to SheetDB:', error);
    return false;
  }
};
