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
      if(!service||r.cliente){
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

  // SEGUNDA SECCIÓN: exactamente UN MOVIMIENTO POR HOJA.
  // Se mantiene la imagen completa sin estirar ni recortar y se adapta
  // únicamente el tamaño de fuente si un registro contiene textos extensos.
  for(let i=0;i<rows.length;i++){
    await AppMotion.yieldPaint();
    doc.addPage();
    const r=rows[i],service=r.configTransporte==='Trabajo / servicio';
    const time=new Date(r.iso).toLocaleTimeString('es-PE',{
      timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false
    });
    const data=[
      ['Código',r.id],
      ['Hora del movimiento',time],
      ...(!service||r.cliente?[[service&&r.tipo==='Entrada'?'Proveedor / Empresa':'Cliente / destino',r.cliente]]:[]),
      ['Conductor / operador',r.conductor],
      ['Placa / serie',r.placa],
      ['Configuración de transporte',r.configTransporte||'Unidad sola'],
      ...(r.carreta?[['Carreta / tolvón',r.carreta]]:[]),
      ...(r.camaBaja?[['Cama baja',r.camaBaja]]:[]),
      ...(r.trabajo?[[r.tipo==='Entrada'?'Trabajo / motivo de entrada':'Trabajo / motivo de salida',r.trabajo]]:
        [[r.maquinariaTransportada?'Maquinaria transportada':'Material registrado',
          r.maquinariaTransportada||r.material||'No registrado']]),
      ...(!service?[['Cantidad registrada',number(r.cantidad)+' '+text(r.unidad)]]:[]),
      ['Guía / correlativo interno',r.guia||'No registrado'],
      ['Autorización',r.autorizacion||'No registrada'],
      ['Responsable',r.responsable||'No registrado'],
      ['Observaciones / incidencias',r.observaciones||'Sin observaciones']
    ];
    y=41;
    bold(13.2);
    doc.text('REGISTRO DETALLADO DE MOVIMIENTO',margin,y);
    const cardY=49.5,cardH=140.5,cardW=inner;
    const barH=12,photoColumnX=154,photoColumnW=124;
    doc.setFillColor(244,248,250);
    doc.roundedRect(margin,cardY,cardW,cardH,3,3,'F');
    doc.setFillColor(...navy);
    doc.roundedRect(margin,cardY,cardW,barH,3,3,'F');
    doc.rect(margin,cardY+barH-4,cardW,4,'F');
    bold(13.5,[255,255,255]);
    doc.text('MOVIMIENTO '+String(i+1).padStart(3,'0')+'  ·  '+upper(r.tipo),margin+5,cardY+8.2);
    bold(14.2,[255,255,255]);
    const plate=upper(r.placa||'');
    if(plate&&doc.getTextWidth(plate)<102)doc.text(plate,W-margin-5,cardY+8.2,{align:'right'});

    // Información ordenada en TABLA DE DOS COLUMNAS: Campo | Información.
    // La imagen y el tamaño de la ficha permanecen sin cambios.
    const tableX=margin+5,tableY=cardY+16,tableW=photoColumnX-tableX-6;
    const labelW=55,infoW=tableW-labelW,headerH=9;
    const availableH=cardY+cardH-4-tableY-headerH;
    const fontSizes=[12.6,12.1,11.6,11.1,10.6,10.1,9.6,9.1,8.6,8.1,7.6,7.1];
    let tableRows=[],selectedSize=fontSizes[fontSizes.length-1],tableLineH=3;
    for(const candidate of fontSizes){
      const lineH=candidate*0.405,measured=[];
      for(const [field,value] of data){
        doc.setFont('Inter','bold');doc.setFontSize(candidate);
        const labels=doc.splitTextToSize(text(field),labelW-5.4);
        doc.setFont('Inter','normal');doc.setFontSize(candidate);
        const values=doc.splitTextToSize(text(value),infoW-5.4);
        const rh=Math.max(6.6,Math.max(labels.length,values.length)*lineH+2.4);
        measured.push({labels,values,height:rh});
      }
      tableRows=measured;selectedSize=candidate;tableLineH=lineH;
      if(measured.reduce((sum,r)=>sum+r.height,0)<=availableH)break;
    }
    doc.setFillColor(...navy);
    doc.rect(tableX,tableY,tableW,headerH,'F');
    bold(10.5,[255,255,255]);
    doc.text('CAMPO',tableX+3,tableY+6);
    doc.text('INFORMACIÓN',tableX+labelW+3,tableY+6);
    let rowY=tableY+headerH;
    doc.setDrawColor(211,222,229);
    doc.setLineWidth(0.17);
    for(let j=0;j<tableRows.length;j++){
      const row=tableRows[j],rowH=row.height;
      doc.setFillColor(...(j%2===0?[250,252,253]:[237,244,248]));
      doc.rect(tableX,rowY,tableW,rowH,'F');
      doc.line(tableX+labelW,rowY,tableX+labelW,rowY+rowH);
      doc.line(tableX,rowY+rowH,tableX+tableW,rowY+rowH);
      const drawLines=(lines,x,font)=>{
        doc.setFont('Inter',font);doc.setFontSize(selectedSize);
        doc.setTextColor(...navy);
        let baseline=rowY+(rowH-lines.length*tableLineH)/2+tableLineH*0.85;
        for(const line of lines){doc.text(line,x,baseline);baseline+=tableLineH;}
      };
      drawLines(row.labels,tableX+2.7,'bold');
      drawLines(row.values,tableX+labelW+2.7,'normal');
      rowY+=rowH;
    }
    doc.setDrawColor(211,222,229);
    doc.rect(tableX,tableY,tableW,rowY-tableY);

    // Evidencia fotográfica más de dos veces más alta que en el reporte anterior.
    const photoX=photoColumnX,photoY=cardY+16;
    const photoW=photoColumnW,photoH=112;
    doc.setFillColor(232,239,243);
    doc.roundedRect(photoX-1,photoY-1,photoW+2,photoH+2,2,2,'F');
    doc.setDrawColor(207,221,230);
    doc.roundedRect(photoX-1,photoY-1,photoW+2,photoH+2,2,2,'S');
    if(r.fotos?.[0]){
      try{
        const photo=r.fotos[0],info=doc.getImageProperties(photo);
        const factor=Math.min(photoW/info.width,photoH/info.height);
        const imageW=info.width*factor,imageH=info.height*factor;
        doc.addImage(photo,info.fileType,
          photoX+(photoW-imageW)/2,photoY+(photoH-imageH)/2,
          imageW,imageH,undefined,'FAST');
      }catch(err){
        regular(12,[86,103,117]);
        doc.text('Fotografía no disponible',photoX+5,photoY+photoH/2);
      }
    }else{
      regular(12,[100,116,128]);
      doc.text('Sin fotografía registrada',photoX+photoW/2,photoY+photoH/2,{align:'center'});
    }
    regular(9.8,[68,86,101]);
    doc.text('EVIDENCIA FOTOGRÁFICA',photoX+photoW/2,photoY+photoH+7,{align:'center'});
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
