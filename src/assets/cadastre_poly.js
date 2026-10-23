// Generated from a QGIS QML style.
// Review unsupported QGIS expressions and advanced renderer options.
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Text from 'ol/style/Text.js';
import CircleStyle from 'ol/style/Circle.js';
import RegularShape from 'ol/style/RegularShape.js';

const baseStyle = new Style({ fill: new Fill({ color: "rgba(240, 240, 240, 0.0000)" }) });

function makeLabelStyle(feature) {
  const value = feature.get("Survey_Num");
  if (value === null || value === undefined || value === '') return null;
  return new Style({
    text: new Text({
      text: String(value),
      font: "6.66667px Arial",
      textAlign: 'center',
      placement: "point",
      fill: new Fill({ color: "rgba(0, 0, 0, 1.0000)" }),
    })
  });
}

export function qmlStyleFunction(feature) {
  const styles = [baseStyle];
  const labelStyle = makeLabelStyle(feature);
  if (labelStyle) styles.push(labelStyle);
  return styles;
}
