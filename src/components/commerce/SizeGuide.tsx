import { sizeGuides } from '@/content/size-guide';
import type { SizeGuideType } from '@shared/types';

/** Tabla de medidas accesible (cabeceras de fila y columna). */
export function SizeGuideTable({ type }: { type: SizeGuideType }) {
  const guide = sizeGuides[type];
  return (
    <div className="prose" style={{ maxWidth: 'none' }}>
      <h3>{guide.title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <caption className="visually-hidden">{guide.title}, medidas en centímetros</caption>
          <thead>
            <tr>
              {guide.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map(([size, ...values]) => (
              <tr key={size}>
                <th scope="row">{size}</th>
                {values.map((value, index) => (
                  <td key={index} className="t-num">
                    {value} cm
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        {guide.howTo.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
