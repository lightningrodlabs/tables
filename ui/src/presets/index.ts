import invoiceGenerator from './invoice-generator.json';
import contacts from './contacts.json';

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  data: any;
}

export const presets: PresetInfo[] = [
  {
    id: 'inoice-generator',
    name: 'Invoice Generator',
    description: 'A simple invoice generator template \nwith a table and a view',
    data: invoiceGenerator
  },
  {
    id: 'contacts',
    name: 'Contacts List',
    description: 'A simple contacts list template \nwith a table and a view',
    data: contacts
  }
];

export const getPresetById = (id: string): PresetInfo | undefined => {
  return presets.find(p => p.id === id);
};
