/* Reportes locales: las dependencias se incluyen para trabajar sin conexión. */
async function buildReportPDF(records, date) {
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  for(const [weight,style] of [[400,'normal'],[700,'bold']]){
    const response=await fetch(`fonts/inter-${weight}.ttf`);if(!response.ok)throw Error('La fuente del reporte no está disponible. Vuelve a abrir la app con conexión.');
    const bytes=new Uint8Array(await response.arrayBuffer());let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
    doc.addFileToVFS(`Inter-${weight}.ttf`,btoa(raw));doc.addFont(`Inter-${weight}.ttf`,'Inter',style);
  }
  const navy=[17,46,70], teal=[7,95,115], margin=12, bottom=194;
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

  doc.setProperties({title:'DIBISER - Reporte diario '+date,subject:'Entradas, salidas y consolidado de almacén',author:'DIBISER E.I.R.L.'});
  const W=297,edge=margin,inner=W-margin*2;
  let y=41;
  const bold=(size,color=navy)=>{doc.setFont('Inter','bold');doc.setFontSize(size);doc.setTextColor(...color)};
  const regular=(size,color=navy)=>{doc.setFont('Inter','normal');doc.setFontSize(size);doc.setTextColor(...color)};
  const softFold=v=>text(v).toLocaleLowerCase('es-PE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const upper=v=>text(v).toLocaleUpperCase('es-PE');
  const isEmpty=v=>['vacio','basio','nada','sin carga','ninguno','sin material','vacia','basia'].includes(softFold(v));
  function materialName(row){
    if(row.configTransporte==='Trabajo / servicio')return 'TRABAJO: '+upper(row.trabajo||'SIN ESPECIFICAR');
    if(row.maquinariaTransportada)return 'MAQUINARIA: '+upper(row.maquinariaTransportada);
    if(isEmpty(row.material))return 'SIN CARGA / VACÍO';
    return upper(row.material||'SIN MATERIAL');
  }
  function combined(){
    const materials=new Map(),clients=new Map(),issues=[];
    for(const r of rows){
      const label=materialName(r),service=r.configTransporte==='Trabajo / servicio';
      const unit=service?'—':upper(r.unidad||'UNIDAD');
      const type=upper(r.tipo||'SIN TIPO');
      const amount=Number(r.cantidad)||0;
      const empty=isEmpty(r.material)&&!service&&!r.maquinariaTransportada;
      if(empty&&amount>0)issues.push({id:r.id,placa:r.placa,value:amount,unit});
      const key=JSON.stringify([softFold(label),softFold(unit),softFold(type)]);
      let m=materials.get(key);
      if(!m){m={label,unit,type,count:0,total:0,review:0,service};materials.set(key,m)}
      m.count++;
      if(!service){
        if(empty&&amount>0)m.review+=amount;
        else m.total+=amount;
      }
      if(!service){
        const client=upper(r.cliente||'SIN CLIENTE'),ck=softFold(client);
        let c=clients.get(ck);
        if(!c){c={name:client,count:0,entries:0,exits:0};clients.set(ck,c)}
        c.count++;
        if(r.tipo==='Entrada')c.entries++;
        if(r.tipo==='Salida')c.exits++;
      }
    }
    const materialRows=[...materials.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es'));
    const clientRows=[...clients.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es'));
    return {materialRows,clientRows,issues};
  }
  const {materialRows,clientRows,issues}=combined();
  const totalEntries=rows.filter(r=>r.tipo==='Entrada').length;
  const totalExits=rows.filter(r=>r.tipo==='Salida').length;
  const photoCount=rows.filter(r=>r.fotos&&r.fotos.length>0).length;
  const pendingAuth=rows.filter(r=>r.autorizacion==='Pendiente').length;
  const formatTotal=m=>m.service?'—':m.review>0?(m.total>0?number(m.total)+' + ':'')+'REVISAR '+number(m.review):number(m.total);
  const summaryFont=9.2;

  function pageHeading(title){
    bold(13);
    doc.text(title,margin,y);
    y+=8;
  }
  async function fullTable(title,head,body,columns){
    await AppMotion.yieldPaint();
    if(y>175){doc.addPage();y=41}
    pageHeading(title);
    if(!body.length){regular(10);doc.text('Sin datos para este apartado.',margin,y+4);y+=13;return}
    doc.autoTable({
      startY:y,
      head:[head],body,theme:'striped',
      margin:{left:margin,right:margin,top:42,bottom:20},
      styles:{font:'Inter',fontSize:9,cellPadding:2.3,overflow:'linebreak',
       textColor:navy,lineColor:[218,227,233],lineWidth:0.1},
      headStyles:{fillColor:navy,textColor:255,fontStyle:'bold'},
      alternateRowStyles:{fillColor:[244,248,250]},
      columnStyles:columns||{},rowPageBreak:'avoid'
    });
    y=doc.lastAutoTable.finalY+9;
  }
  function miniTable(title,head,body,x,w){
    bold(10);
    doc.text(title,x,y);
    doc.autoTable({
      startY:y+4,head:[head],body:body.length?body:[['Sin registros',...head.slice(1).map(()=>'—')]],
      margin:{left:x,right:W-x-w,top:44,bottom:18},tableWidth:w,theme:'striped',
      styles:{font:'Inter',fontSize:8.7,cellPadding:2.35,overflow:'linebreak',
        textColor:navy,lineColor:[223,229,233],lineWidth:.1},
      headStyles:{fillColor:navy,textColor:255,fontStyle:'bold'},
      alternateRowStyles:{fillColor:[245,248,250]},
      rowPageBreak:'avoid'
    });
    return doc.lastAutoTable.finalY;
  }
  function kpi(label,value,x,w){
    doc.setFillColor(239,245,248);
    doc.roundedRect(x,y,w,23,2,2,'F');
    bold(19,teal);
    doc.text(String(value),x+4,y+11);
    regular(8.5);
    doc.text(label,x+4,y+18);
  }

  // PÁGINA 1 - resumen ejecutivo y adelanto de los consolidados.
  pageHeading('Resumen general de la jornada');
  const gap=5,box=(inner-3*gap)/4;
  kpi('MOVIMIENTOS',rows.length,margin,box);
  kpi('ENTRADAS',totalEntries,margin+box+gap,box);
  kpi('SALIDAS',totalExits,margin+(box+gap)*2,box);
  kpi('CON FOTOGRAFÍA',photoCount,margin+(box+gap)*3,box);
  y+=31;
  regular(9.6);
  doc.text('Fecha: '+dateLabel+'    |    Autorizaciones pendientes: '+pendingAuth+
    '    |    Registros disponibles de los dispositivos vinculados',margin,y);
  y+=9;
  const leftW=145,rightX=margin+150,rightW=inner-150;
  const leftEnd=miniTable('Materiales y trabajos más frecuentes',
    ['Material / trabajo','Registros','Cantidad'],
    materialRows.slice(0,7).map(m=>[m.label,m.count,formatTotal(m)+(m.service?'':' '+m.unit)]),
    margin,leftW);
  const rightEnd=miniTable('Destinos / clientes más frecuentes',
    ['Cliente / destino','Mov.','E','S'],
    clientRows.slice(0,7).map(c=>[c.name,c.count,c.entries,c.exits]),rightX,rightW);
  y=Math.max(leftEnd,rightEnd)+9;
  if(issues.length){
    const notice='Revisar '+issues.length+' registro(s) marcados como vacío/sin carga con cantidad mayor a cero. '+
      'Estas cantidades NO se suman como volumen de material hasta su verificación.';
    doc.setFillColor(251,247,237);
    const noticeLines=doc.splitTextToSize(notice,inner-10);
    const noticeH=Math.max(15,noticeLines.length*4.7+8);
    if(y+noticeH<bottom){
      doc.roundedRect(margin,y,inner,noticeH,2,2,'F');
      regular(9.1,[102,73,32]);
      doc.text(noticeLines,margin+5,y+6);
      y+=noticeH+5;
    }
  }
  if(y+13<bottom){
    regular(8.8,[85,103,117]);
    doc.text('El detalle íntegro y sus fotografías están a continuación. Los consolidados completos aparecen al final.',margin,y+4);
  }
  if(!rows.length){
    y=Math.min(y+18,bottom-10);
    regular(11);
    doc.text('No se registraron movimientos para esta fecha.',margin,y);
  }

  // DESPUÉS: fichas con letra legible y fotografía ampliada.
  if(rows.length){doc.addPage();y=41;pageHeading('Movimientos detallados con evidencia fotográfica')}
  for(let i=0;i<rows.length;i++){
    await AppMotion.yieldPaint();
    const r=rows[i];
    const time=new Date(r.iso).toLocaleTimeString('es-PE',{
      timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false
    });
    const service=r.configTransporte==='Trabajo / servicio';
    const data=[
      ['Código',r.id],
      ['Hora',time],
      ...(!service?[['Cliente / destino',r.cliente]]:[]),
      ['Conductor',r.conductor],
      ['Placa / serie',r.placa],
      ['Transporte',r.configTransporte||'Unidad sola'],
      ...(r.carreta?[['Carreta / tolvón',r.carreta]]:[]),
      ...(r.camaBaja?[['Cama baja',r.camaBaja]]:[]),
      ...(r.trabajo?[['Trabajo / motivo',r.trabajo]]:
       [[r.maquinariaTransportada?'Maquinaria':'Material',r.maquinariaTransportada||r.material||'No registrado']]),
      ...(!service?[['Cantidad registrada',number(r.cantidad)+' '+text(r.unidad)]]:[]),
      ['Guía / correlativo interno',r.guia||'No registrado'],
      ['Autorización',r.autorizacion||'No registrada'],
      ['Responsable',r.responsable||'No registrado'],
      ['Observaciones',r.observaciones||'Sin observaciones']
    ];
    const hasPhoto=!!(r.fotos&&r.fotos[0]),panelW=inner;
    const rightW=hasPhoto?117:0,detailW=hasPhoto?151:panelW-10;
    regular(9.7);
    const fieldLines=[];
    for(const [name,value] of data){
      const content=name+': '+text(value);
      for(const line of doc.splitTextToSize(content,detailW-6))fieldLines.push(line);
    }
    const lineHeight=4.42,cardH=Math.max(70,14+fieldLines.length*lineHeight);
    if(y+cardH>bottom){
      doc.addPage();y=41;pageHeading('Movimientos detallados (continuación)');
    }
    const cardY=y;
    doc.setFillColor(245,249,251);
    doc.roundedRect(margin,cardY,panelW,cardH,2.5,2.5,'F');
    doc.setFillColor(...navy);
    doc.roundedRect(margin,cardY,panelW,8.7,2,2,'F');
    doc.rect(margin,cardY+5,panelW,3.7,'F');
    bold(10.4,[255,255,255]);
    doc.text('MOVIMIENTO '+String(i+1).padStart(3,'0')+'  ·  '+upper(r.tipo),margin+4,cardY+6.05);
    regular(9.7);
    let lineY=cardY+13.2;
    for(const line of fieldLines){doc.text(line,margin+4,lineY);lineY+=lineHeight;}
    if(hasPhoto){
      const photoX=margin+panelW-rightW+3,photoY=cardY+10.4;
      const maxW=rightW-8,maxH=Math.min(55,cardH-13);
      doc.setDrawColor(210,221,230);
      doc.rect(photoX-1,photoY-1,maxW+2,maxH+2);
      try{
        const photo=r.fotos[0],info=doc.getImageProperties(photo);
        const fit=Math.min(maxW/info.width,maxH/info.height);
        const pw=info.width*fit,ph=info.height*fit;
        doc.addImage(photo,info.fileType,photoX+(maxW-pw)/2,photoY+(maxH-ph)/2,pw,ph,undefined,'FAST');
      }catch(err){
        regular(9,[95,105,114]);
        doc.text('Fotografía no disponible',photoX+2,photoY+18);
      }
      regular(7.6,[65,83,95]);
      doc.text('Evidencia fotográfica',photoX,photoY+maxH+3.6);
    }
    y+=cardH+4.5;
  }

  // ÚLTIMA SECCIÓN: todos los consolidados, agrupados por nombres equivalentes.
  if(rows.length){doc.addPage();y=41}
  await fullTable('Consolidado completo por material, maquinaria y trabajo',
    ['Material / maquinaria / trabajo','Unidad','Movimiento','Registros','Cantidad total'],
    materialRows.map(m=>[m.label,m.unit,m.type,m.count,formatTotal(m)]),
    {0:{cellWidth:147},1:{cellWidth:27},2:{cellWidth:33},3:{cellWidth:26},4:{cellWidth:40}});
  await fullTable('Consolidado completo por cliente / destino',
    ['Cliente / empresa / destino','Movimientos','Entradas','Salidas'],
    clientRows.map(c=>[c.name,c.count,c.entries,c.exits]),
    {0:{cellWidth:169},1:{cellWidth:39},2:{cellWidth:33},3:{cellWidth:32}});
  if(issues.length){
    await fullTable('Registros con cantidad por verificar (sin carga / vacío)',
      ['Código','Placa','Cantidad registrada','Unidad'],
      issues.map(r=>[r.id,r.placa,number(r.value),r.unit]),
      {0:{cellWidth:112},1:{cellWidth:52},2:{cellWidth:65},3:{cellWidth:44}});
  }
  const pages=doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);
    doc.setFillColor(...navy);doc.rect(0,0,297,3,'F');
    if(logo&&logoSize)doc.addImage(logo,'PNG',margin+(32-logoSize.width)/2,7+(23-logoSize.height)/2,logoSize.width,logoSize.height);
    bold(16);
    doc.text('DIBISER E.I.R.L.',52,15);
    bold(10);
    doc.text('REPORTE DIARIO DE MOVIMIENTOS DE ALMACÉN',52,22);
    regular(8.5);
    doc.text('Fecha: '+dateLabel+'   |   Hora de referencia: Perú (UTC-5)',52,28);
    doc.setDrawColor(...teal);doc.line(margin,34,297-margin,34);
    doc.setDrawColor(210);doc.line(margin,197,297-margin,197);
    regular(7.3,[75,88,100]);
    doc.text('Control de almacén · Generado: '+generated+' (Perú) · Historial disponible local y sincronizado',margin,202);
    doc.text('Página '+p+' de '+pages,297-margin,202,{align:'right'});
  }
  return doc;
}
$('pdf').onclick=async()=>{
 const button=$('pdf'), status=$('pdfStatus');if(button.disabled)return;button.disabled=true;const finish=AppMotion.busy(button);button.textContent='Preparando PDF…';status.textContent='Organizando movimientos y evidencias.';
 try{await AppMotion.yieldPaint();const date=$('reportDate').value;if(!date)throw Error('Selecciona la fecha del reporte.');const rows=(await all()).filter(r=>dateKey(r.iso)===date);const pdf=await buildReportPDF(rows,date);pdf.save(`DIBISER_Reporte_${date}.pdf`);status.textContent='PDF generado. Revisa las descargas de tu dispositivo.'}
 catch(e){status.textContent='No se pudo generar el PDF. '+e.message}
 finally{finish();button.disabled=false;button.textContent='Descargar reporte PDF'}
};
