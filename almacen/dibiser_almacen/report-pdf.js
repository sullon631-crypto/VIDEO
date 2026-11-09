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
  heading('Resumen de operación');
  await table(['Fecha de operación','Movimientos','Entradas','Salidas','Pendientes de autorización'],[[dateLabel,rows.length,rows.filter(r=>r.tipo==='Entrada').length,rows.filter(r=>r.tipo==='Salida').length,rows.filter(r=>r.autorizacion==='Pendiente').length]]);
  heading('Detalle de movimientos');
  await table(['N.º / Hora','Placa / Serie','Tipo','Cliente / Destino','Conductor','Material','Cantidad','Guía','Autorización'],rows.length?rows.map((r,i)=>[`${i+1}\n${new Date(r.iso).toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false})}`,text(r.placa)+(r.carreta?'\nCarreta: '+text(r.carreta):'')+(r.camaBaja?'\nCama baja: '+text(r.camaBaja):''),text(r.tipo),text(r.cliente),text(r.conductor),text(r.maquinariaTransportada?'Maquinaria: '+r.maquinariaTransportada:r.material),`${number(r.cantidad)} ${text(r.unidad)}`,text(r.guia)||'No registrada',text(r.autorizacion)||'No registrada']):[['—','Sin movimientos para esta fecha','','','','','','','']],{0:{cellWidth:17},1:{cellWidth:26},2:{cellWidth:18},3:{cellWidth:47},4:{cellWidth:33},5:{cellWidth:51},6:{cellWidth:22},7:{cellWidth:25},8:{cellWidth:30}});
  heading('Consolidado por material, unidad y movimiento');
  const sums=new Map();
  for(const r of rows){const key=JSON.stringify([r.maquinariaTransportada||r.material,r.unidad,r.tipo]);const val=sums.get(key)||{material:r.maquinariaTransportada?'Maquinaria: '+r.maquinariaTransportada:r.material,unidad:r.unidad,tipo:r.tipo,total:0,count:0};val.total+=Number(r.cantidad);val.count++;sums.set(key,val)}
  await table(['Material','Unidad','Movimiento','Registros','Cantidad total'],sums.size?[...sums.values()].map(r=>[text(r.material),text(r.unidad),text(r.tipo),r.count,number(r.total)]):[['Sin materiales registrados','—','—','0','0']]);
  heading('Trazabilidad y observaciones');
  await table(['N.º','Código del movimiento','Responsable','Observaciones / incidencias'],rows.length?rows.map((r,i)=>[i+1,text(r.id),text(r.responsable),[r.configTransporte||'Unidad sola',r.carreta?'Carreta: '+r.carreta:'',r.camaBaja?'Cama baja: '+r.camaBaja:'',r.observaciones||''].filter(Boolean).join(' · ')]):[['—','Sin movimientos','—','—']],{0:{cellWidth:14},1:{cellWidth:66},2:{cellWidth:62},3:{cellWidth:127}});
  const evidence=rows.filter(r=>r.fotos?.length);
  if(evidence.length){doc.addPage();y=43;heading('Anexo · Evidencias fotográficas');
    for(const r of evidence){
      await AppMotion.yieldPaint();
      const i=rows.indexOf(r)+1;
      const caption=doc.splitTextToSize(`Movimiento ${i} | ${text(r.id)} | Placa: ${text(r.placa)} | ${text(r.cliente)}`,265);
      const height=caption.length*4+65;
      if(y+height>bottom){doc.addPage();y=43;heading('Anexo · Evidencias fotográficas (continuación)')}
      doc.setFont('Inter','bold');doc.setFontSize(9);doc.setTextColor(...navy);doc.text(caption,margin,y);y+=caption.length*4+3;
      for(let j=0;j<Math.min(3,r.fotos.length);j++){
        const x=margin+j*91;
        try{const info=doc.getImageProperties(r.fotos[j]);const ratio=Math.min(85/info.width,52/info.height);const w=info.width*ratio,h=info.height*ratio;doc.addImage(r.fotos[j],info.fileType,x+(85-w)/2,y,w,h,undefined,'FAST')}
        catch{doc.setFontSize(9);doc.text('Imagen no disponible',x+5,y+20)}
        doc.setFont('Inter','normal');doc.setFontSize(8);doc.text(`Evidencia ${j+1} · Movimiento ${i}`,x,y+57);
      }y+=67;
    }
  }else{heading('Evidencias fotográficas');doc.setFont('Inter','normal');doc.setFontSize(9);doc.text('No se adjuntaron fotografías a los movimientos de esta fecha.',margin,y);y+=12}
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
