import * as React from 'react';

import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          'ar-modes'?: string;
          'camera-controls'?: boolean;
          'touch-action'?: string;
          'shadow-intensity'?: string;
          'environment-image'?: string;
          exposure?: string;
          'auto-rotate'?: boolean;
          poster?: string;
          'skybox-image'?: string;
          loading?: string;
          reveal?: string;
        },
        HTMLElement
      >;
    }
  }
}
