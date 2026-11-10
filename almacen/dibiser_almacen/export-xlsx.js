/* Exportador XLSX nativo sin librerías externas; funciona sin conexión. */
(function(){
  'use strict';
  const enc=new TextEncoder();
  const xml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const put16=(v,n)=>{v.push(n&255,(n>>>8)&255)};
  const put32=(v,n)=>{v.push(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)};
  const crcTable=Uint32Array.from({length:256},(_,k)=>{for(let i=0;i<8;i++)k=k&1?0xEDB88320^(k>>>1):k>>>1;return k>>>0;});
  function crc(bytes){let n=0xFFFFFFFF;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xFFFFFFFF)>>>0;}
  function zip(files){
    const segments=[],central=[];let offset=0;
    for(const [name,content] of Object.entries(files)){
      const data=enc.encode(content),file=enc.encode(name),checksum=crc(data),local=[];
      put32(local,0x04034b50);put16(local,20);put16(local,0x0800);put16(local,0);
      put16(local,0);put16(local,0);put32(local,checksum);put32(local,data.length);put32(local,data.length);
      put16(local,file.length);put16(local,0);
      segments.push(Uint8Array.from(local),file,data);
      const dir=[];put32(dir,0x02014b50);put16(dir,20);put16(dir,20);
      put16(dir,0x0800);put16(dir,0);put16(dir,0);put16(dir,0);
      put32(dir,checksum);put32(dir,data.length);put32(dir,data.length);
      put16(dir,file.length);put16(dir,0);put16(dir,0);put16(dir,0);put16(dir,0);
      put32(dir,0);put32(dir,offset);
      central.push(Uint8Array.from(dir),file);
      offset+=local.length+file.length+data.length;
    }
    const centralSize=central.reduce((sum,x)=>sum+x.length,0);
    const end=[];put32(end,0x06054b50);put16(end,0);put16(end,0);
    const count=Object.keys(files).length;
    put16(end,count);put16(end,count);put32(end,centralSize);put32(end,offset);put16(end,0);
    return new Blob([...segments,...central,Uint8Array.from(end)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  const column=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  function sheet(headers,rows,widths){
    const lines=[headers,...rows];
    let cells='';
    for(let i=0;i<lines.length;i++){
      const row=lines[i],r=i+1;cells+='<row r="'+r+'">';
      for(let j=0;j<headers.length;j++){
        const value=row[j],ref=column(j)+r,style=i===0?' s="1"':'';
        if(typeof value==='number'&&Number.isFinite(value))cells+='<c r="'+ref+'"'+style+'><v>'+value+'</v></c>';
        else cells+='<c r="'+ref+'" t="inlineStr"'+style+'><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
      }
      cells+='</row>';
    }
    const cols='<cols>'+headers.map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(widths[i]||22)+'" customWidth="1"/>').join('')+'</cols>';
    const area='A1:'+column(headers.length-1)+Math.max(1,lines.length);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      cols+'<sheetData>'+cells+'</sheetData><autoFilter ref="'+area+'"/></worksheet>';
  }
  const props='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const fields=[
    ['Código del movimiento',r=>r.id],['Fecha y hora (Perú)',r=>new Date(r.iso).toLocaleString('es-PE',{timeZone:'America/Lima'})],
    ['Entrada / Salida',r=>r.tipo],['Placa / Serie',r=>r.placa],
    ['Configuración de transporte',r=>r.configTransporte||'Unidad sola'],['Carreta / Tolvón',r=>r.carreta],
    ['Cama baja',r=>r.camaBaja],['Maquinaria transportada',r=>r.maquinariaTransportada],
    ['Trabajo / motivo de salida',r=>r.trabajo],['Cliente / Empresa / Destino',r=>r.cliente],
    ['Conductor / Operador',r=>r.conductor],['Material',r=>r.material],
    ['Cantidad',r=>r.configTransporte==='Trabajo / servicio'?'':Number(r.cantidad)||0],['Unidad de medida',r=>r.configTransporte==='Trabajo / servicio'?'':r.unidad],
    ['Número de guía',r=>r.guia],['Autorización',r=>r.autorizacion],
    ['Observaciones',r=>r.observaciones],['Responsable',r=>r.responsable],
    ['Fotografía registrada',r=>r.fotos?.length?'Sí':'No']
  ];
  function build(records,date){
    const sorted=[...records].sort((a,b)=>String(a.iso).localeCompare(String(b.iso)));
    const header=fields.map(f=>f[0]),rows=sorted.map(r=>fields.map(f=>f[1](r)??''));
    const byConcept=new Map();
    for(const r of sorted){
      const concept=r.maquinariaTransportada?'Maquinaria: '+r.maquinariaTransportada:r.trabajo?'Trabajo: '+r.trabajo:r.material||'Sin material';
      const servicio=r.configTransporte==='Trabajo / servicio';const unit=servicio?'—':r.unidad;const key=JSON.stringify([r.tipo,concept,unit]);
      const rec=byConcept.get(key)||{tipo:r.tipo,concept,unidad:unit,n:0,q:0};
      rec.n++;if(!servicio)rec.q+=Number(r.cantidad)||0;byConcept.set(key,rec);
    }
    const resumen=[
      ['Fecha del reporte',date],['Movimientos',sorted.length],
      ['Entradas',sorted.filter(r=>r.tipo==='Entrada').length],
      ['Salidas',sorted.filter(r=>r.tipo==='Salida').length],
      ['Autorizaciones pendientes',sorted.filter(r=>r.autorizacion==='Pendiente').length],
      ['Con fotografía',sorted.filter(r=>r.fotos?.length).length],
      ['Información','Las fotos están en el registro y el PDF, no incrustadas en este Excel.']
    ];
    const summaryRows=resumen.map(r=>[r[0],r[1],'','','']);
    summaryRows.push(['','','','',''],['Movimiento','Material / maquinaria / trabajo','Unidad','Registros','Cantidad total']);
    for(const r of byConcept.values())summaryRows.push([r.tipo,r.concept,r.unidad,r.n,r.unidad==='—'?'—':r.q]);
    const workbook=props+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Movimientos" sheetId="1" r:id="rId1"/><sheet name="Resumen" sheetId="2" r:id="rId2"/></sheets></workbook>';
    const workbookRels=props+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const files={
      '[Content_Types].xml':props+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels':props+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':workbookRels,
      'xl/styles.xml':props+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF112E46"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>',
      'xl/worksheets/sheet1.xml':sheet(header,rows,fields.map(([k])=>Math.min(45,Math.max(17,k.length+5)))),
      'xl/worksheets/sheet2.xml':sheet(['Concepto','Resultado','Unidad','Registros','Cantidad total'],summaryRows,[35,49,18,16,20])
    };
    return zip(files);
  }
  window.DibiserExcel={build};
})();