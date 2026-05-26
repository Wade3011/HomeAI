import type { CustomItemSpec } from '@/types';

export interface CustomDragTemplate extends CustomItemSpec {
  templateId: string;
}

export function customDragFromTemplate(template: {
  id: string;
  label: string;
  shape: CustomItemSpec['shape'];
  widthIn: number;
  depthIn: number;
  heightIn: number;
  sectionalRunIn?: number;
  sectionalArmDepthIn?: number;
}): CustomDragTemplate {
  return {
    templateId: template.id,
    label: template.label,
    shape: template.shape,
    widthIn: template.widthIn,
    depthIn: template.depthIn,
    heightIn: template.heightIn,
    sectionalRunIn: template.sectionalRunIn,
    sectionalArmDepthIn: template.sectionalArmDepthIn,
  };
}
