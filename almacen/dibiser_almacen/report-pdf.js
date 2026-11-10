/* Reportes locales: las dependencias se incluyen para trabajar sin conexión. */
async function buildReportPDF(records, date) {
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  for(const [weight,style] of [[400,'normal'],[700,'bold']]){
    const response=await fetch(`fonts/inter-${weight}.ttf`);if(!response.ok)throw Error('La fuente del reporte no está disponible. Vuelve a abrir la app con conexión.');
    const bytes=new Uint8Array(await response.arrayBuffer());let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
    doc.addFileToVFS(`Inter-${weight}.ttf`,btoa(raw));doc.addFont(`Inter-${weight}.ttf`,'Inter',style);
  }
  const navy=[17,46,70], teal=[7,95,115], margin=14, bottom=192;
  const rows=[...records].sort((a,b)=>a.iso.localeCompare(b.iso));
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const number=n=>Number(n||0).toLocaleString('es-PE',{maximumFractionDigits:2});
  const dateLabel=date.split('-').reverse().join('/');
  const generated=new Date().toLocaleString('es-PE',{timeZone:'America/Lima'});
  // Recorta únicamente los márgenes blancos del logotipo y conserva su proporción.
  let logo=null, logoSize=null;
  try {
    const im=new Image();im.src='logo.jpeg';await im.decode();
    const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
    const {data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let y=0;y<height;y++){for(let x=0;x<width;x++){
      const k=(y*width+x)*4;
      if(data[k+3]>40 && Math.min(data[k],data[k+1],data[k+2])<235){
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }}
    if(maxX<minX){minX=0;minY=0;maxX=width-1;maxY=height-1;}
    const pad=5,x0=Math.max(0,minX-pad),y0=Math.max(0,minY-pad);
    const w=Math.min(width-x0,maxX-minX+1+pad*2),h=Math.min(height-y0,maxY-minY+1+pad*2);
    const trimmed=document.createElement('canvas');trimmed.width=w;trimmed.height=h;
    const out=trimmed.getContext('2d');out.fillStyle='#FFFFFF';out.fillRect(0,0,w,h);
    out.drawImage(canvas,x0,y0,w,h,0,0,w,h);
    logo=trimmed;
    const scale=Math.min(32/w,23/h);
    logoSize={width:w*scale,height:h*scale};
  }catch(err){console.warn('Logo no disponible para el PDF:',err)}
  let y=43;
  function heading(label){if(y>bottom-20){doc.addPage();y=43}doc.setFont('Inter','bold');doc.setFontSize(12);doc.setTextColor(...navy);doc.text(label,margin,y);y+=5}
  async function table(head,body,widths){
    await AppMotion.yieldPaint();
    doc.autoTable({startY:y,head:[head],body,margin:{top:43,bottom:20,left:margin,right:margin},theme:'striped',styles:{font:'Inter',fontSize:8,cellPadding:2.5,overflow:'linebreak',textColor:navy,lineColor:[220,227,232],lineWidth:.1},headStyles:{fillColor:navy,textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[245,248,250]},columnStyles:widths||{},rowPageBreak:'avoid'});
    y=doc.lastAutoTable.finalY+10;
  }
  doc.setProperties({title:`DIBISER - Reporte de movimientos ${date}`,subject:'Control diario de almacén',author:'DIBISER E.I.R.L.'});
  // PRIMERO: ficha completa por movimiento con su fotografía, cuando exista.
  heading('Registro detallado de movimientos');
  if(!rows.length){
    doc.setFont('Inter','normal');doc.setFontSize(10);doc.setTextColor(...navy);
    doc.text('No se registraron movimientos para esta fecha.',margin,y+8);
    y+=19;
  }
  for(let i=0;i<rows.length;i++){
    await AppMotion.yieldPaint();
    const r=rows[i];
    const time=new Date(r.iso).toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false});
    const hasPhoto=!!r.fotos?.[0];
    const rightW=hasPhoto?94:0;
    const contentW=hasPhoto?161:255;
    const data=[
      ['Código',r.id],
      ['Hora / movimiento',time+' · '+text(r.tipo)],
      ...(r.configTransporte!=='Trabajo / servicio'?[['Cliente / empresa / destino',r.cliente]]:[]),
      ['Conductor / operador',r.conductor],
      ['Placa / serie',r.placa],
      ['Configuración de transporte',r.configTransporte||'Unidad sola'],
      ...(r.carreta?[['Carreta / tolvón',r.carreta]]:[]),
      ...(r.camaBaja?[['Cama baja',r.camaBaja]]:[]),
      ...(!r.trabajo?[[r.maquinariaTransportada?'Maquinaria registrada':'Material registrado',r.maquinariaTransportada||r.material||'No registrado']]:[]),
      ...(r.configTransporte!=='Trabajo / servicio'?[['Cantidad',number(r.cantidad)+' '+text(r.unidad)]]:[]),
      ['Guía de remisión',r.guia||'No registrada'],
      ['Autorización',r.autorizacion||'No registrada'],
      ['Responsable',r.responsable||'No registrado'],
      ...(r.trabajo?[['Trabajo / motivo de salida',r.trabajo]]:[]),
      ['Observaciones / incidencias',r.observaciones||'Sin observaciones']
    ];
    doc.setFont('Inter','normal');doc.setFontSize(8);
    const lines=data.flatMap(([label,val])=>doc.splitTextToSize(label+': '+text(val),contentW-8));
    const lineHeight=4.15;
    const contentHeight=lines.length*lineHeight+6;
    const photoHeight=hasPhoto?73:0;
    const cardH=Math.max(contentHeight,photoHeight)+15;
    if(y+cardH>bottom){
      doc.addPage();y=43;heading('Registro detallado de movimientos (continuación)');
    }
    const cardY=y;
    doc.setFillColor(244,248,250);
    doc.roundedRect(margin,cardY,269,cardH,2.5,2.5,'F');
    doc.setFillColor(...navy);
    doc.roundedRect(margin,cardY,269,9,2.5,2.5,'F');
    doc.rect(margin,cardY+5,269,4,'F');
    doc.setTextColor(255);doc.setFont('Inter','bold');doc.setFontSize(9);
    doc.text('MOVIMIENTO '+String(i+1).padStart(3,'0')+'  ·  '+text(r.tipo).toUpperCase(),margin+4,cardY+6);
    doc.setTextColor(...navy);doc.setFont('Inter','normal');doc.setFontSize(8);
    let lineY=cardY+13;
    for(const line of lines){doc.text(line,margin+4,lineY);lineY+=lineHeight;}
    if(hasPhoto){
      const x=margin+269-rightW+4,photoY=cardY+12,maxW=rightW-9,maxH=61;
      doc.setDrawColor(216,225,230);doc.rect(x-1,photoY-1,maxW+2,maxH+2);
      try{
        const photo=r.fotos[0],info=doc.getImageProperties(photo);
        const ratio=Math.min(maxW/info.width,maxH/info.height);
        const w=info.width*ratio,h=info.height*ratio;
        doc.addImage(photo,info.fileType,x+(maxW-w)/2,photoY+(maxH-h)/2,w,h,undefined,'FAST');
      }catch{
        doc.setTextColor(110);doc.text('Fotografía no disponible',x+2,photoY+16);doc.setTextColor(...navy);
      }
      doc.setFontSize(7);doc.text('Evidencia del movimiento '+(i+1),x,photoY+maxH+5);
    }
    y+=cardH+6;
  }

  // DESPUÉS: resumen gerencial y consolidado de todos los registros del día.
  if(rows.length){doc.addPage();y=43;}
  heading('Resumen consolidado de la jornada');
  await table(
    ['Fecha','Movimientos','Entradas','Salidas','Autorizaciones pendientes','Con fotografía'],
    [[dateLabel,rows.length,rows.filter(r=>r.tipo==='Entrada').length,
      rows.filter(r=>r.tipo==='Salida').length,rows.filter(r=>r.autorizacion==='Pendiente').length,
      rows.filter(r=>r.fotos?.length).length]]
  );
  if(rows.length){
    heading('Consolidado por material, maquinaria y trabajo');
    const sums=new Map();
    for(const r of rows){
      const label=r.maquinariaTransportada?'Maquinaria: '+text(r.maquinariaTransportada):(r.trabajo?'Trabajo: '+text(r.trabajo):text(r.material||'Sin material'));
      const servicio=r.configTransporte==='Trabajo / servicio';const unit=servicio?'—':text(r.unidad),type=text(r.tipo);
      const key=JSON.stringify([label,unit,type]);
      const item=sums.get(key)||{label,unit,type,count:0,total:0};
      item.count++;if(!servicio)item.total+=Number(r.cantidad)||0;sums.set(key,item);
    }
    await table(['Material / maquinaria / trabajo','Unidad','Movimiento','Registros','Cantidad total'],
      [...sums.values()].map(r=>[r.label,r.unit,r.type,r.count,r.unit==='—'?'—':number(r.total)]));
    heading('Consolidado por cliente / destino');
    const clients=new Map();
    for(const r of rows){
      if(r.configTransporte==='Trabajo / servicio')continue;
      const key=text(r.cliente)||'Sin cliente';
      const item=clients.get(key)||{name:key,count:0,entries:0,exits:0};
      item.count++;if(r.tipo==='Entrada')item.entries++;if(r.tipo==='Salida')item.exits++;
      clients.set(key,item);
    }
    if(clients.size)await table(['Cliente / empresa / destino','Movimientos','Entradas','Salidas'],
      [...clients.values()].map(r=>[r.name,r.count,r.entries,r.exits]));
  }
  const pages=doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);doc.setFillColor(...navy);doc.rect(0,0,297,3,'F');
    if(logo && logoSize)doc.addImage(logo,'PNG',margin+(32-logoSize.width)/2,7+(23-logoSize.height)/2,logoSize.width,logoSize.height);
    doc.setTextColor(...navy);doc.setFont('Inter','bold');doc.setFontSize(16);doc.text('DIBISER E.I.R.L.',52,15);doc.setFontSize(10);doc.text('REPORTE DIARIO DE MOVIMIENTOS DE ALMACÉN',52,22);
    doc.setFont('Inter','normal');doc.setFontSize(8);doc.text(`Fecha: ${dateLabel}   |   Hora de referencia: Perú (UTC-5)`,52,28);
    doc.setDrawColor(...teal);doc.line(margin,34,283,34);
    doc.setDrawColor(210);doc.line(margin,197,283,197);doc.setTextColor(85);doc.setFontSize(7);
    doc.text(`Control de almacén · Generado: ${generated} (Perú) · Registros de este dispositivo`,margin,202);doc.text(`Página ${p} de ${pages}`,283,202,{align:'right'});
  }
  return doc;
}
$('pdf').onclick=async()=>{
 const button=$('pdf'), status=$('pdfStatus');if(button.disabled)return;button.disabled=true;const finish=AppMotion.busy(button);button.textContent='Preparando PDF…';status.textContent='Organizando movimientos y evidencias.';
 try{await AppMotion.yieldPaint();const date=$('reportDate').value;if(!date)throw Error('Selecciona la fecha del reporte.');const rows=(await all()).filter(r=>dateKey(r.iso)===date);const pdf=await buildReportPDF(rows,date);pdf.save(`DIBISER_Reporte_${date}.pdf`);status.textContent='PDF generado. Revisa las descargas de tu dispositivo.'}
 catch(e){status.textContent='No se pudo generar el PDF. '+e.message}
 finally{finish();button.disabled=false;button.textContent='Descargar reporte PDF'}
};
