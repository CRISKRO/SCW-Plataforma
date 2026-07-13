"use client";

import React from 'react';

import PageBackButton from '@/components/PageBackButton';

export default function TerminosYCondicionesPage() {
  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageBackButton />
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-8 text-center">
          Política Legal Integral
        </h1>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-10 space-y-6 text-zinc-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">STRONG CLASSIC WRESTLING (SCW)</h2>
            <p className="text-sm text-zinc-500">Última actualización: 01/JULIO/2026</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">AVISO IMPORTANTE</h3>
            <p>
              Bienvenido al sitio web oficial de Strong Classic Wrestling (SCW). El acceso, navegación, utilización de servicios, compra de boletos, adquisición de productos, participación en promociones y asistencia a eventos organizados por SCW implica la aceptación de los presentes Términos y Condiciones, Política de Privacidad, Política de Cookies y Políticas Comerciales.
            </p>
            <p>
              Si no está de acuerdo con cualquiera de las disposiciones aquí contenidas, deberá abstenerse de utilizar este sitio web y los servicios ofrecidos por SCW.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO I - IDENTIDAD DEL RESPONSABLE</h3>
            <p>
              Strong Classic Wrestling (SCW), en adelante “SCW”, es responsable de la administración, operación y comercialización de los servicios, eventos, promociones y productos ofrecidos a través de este sitio web.
            </p>
            <p>Para cualquier consulta relacionada con privacidad, protección de datos o aspectos legales, los usuarios podrán comunicarse a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Correo electrónico:</strong> contacto@scw-lucha.com</li>
              <li><strong>Teléfono:</strong> 4435028658</li>
              <li><strong>Domicilio:</strong> Av. Michoacán #614, Col. Las Margaritas, Morelia, Michoacán.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO II - USO DEL SITIO WEB</h3>
            <p>El sitio web tiene como finalidad proporcionar información sobre:</p>
            <ul className="list-disc pl-5 space-y-1 grid grid-cols-1 md:grid-cols-2">
              <li>Eventos de lucha libre.</li>
              <li>Venta de boletos.</li>
              <li>Venta de mercancía oficial.</li>
              <li>Registro a actividades y seminarios.</li>
              <li>Información institucional.</li>
              <li>Promociones y sorteos.</li>
              <li>Contenido multimedia.</li>
              <li>Actividades relacionadas con SCW y The Wrestling Factory by SCW.</li>
            </ul>
            <p className="mt-4">El usuario se compromete a utilizar el sitio de forma lícita y respetuosa. Queda prohibido:</p>
            <ul className="list-disc pl-5 space-y-1 text-red-400">
              <li>Utilizar el sitio para actividades ilegales.</li>
              <li>Intentar acceder a sistemas restringidos.</li>
              <li>Copiar o reproducir contenido sin autorización.</li>
              <li>Difundir información falsa o fraudulenta.</li>
              <li>Interferir con el funcionamiento normal del sitio.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO III - PROPIEDAD INTELECTUAL</h3>
            <p>Todos los contenidos del sitio, incluyendo logotipos, diseños, marcas, nombres comerciales, fotografías, videos, ilustraciones, textos, material promocional y audiovisual son propiedad de SCW o de sus respectivos titulares.</p>
            <p>Ningún contenido podrá reproducirse, distribuirse, modificarse o explotarse comercialmente sin autorización expresa y por escrito.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO IV - VENTA DE BOLETOS</h3>
            <p>La compra de boletos constituye la aceptación total de la presente política.</p>
            <p className="font-bold text-white">Todos los boletos son considerados ventas finales.</p>
            <p>Los boletos adquiridos no serán reembolsables ni transferibles salvo disposición legal obligatoria en contrario.</p>
            <p>SCW podrá modificar horarios, carteleras, participantes, actividades y formatos de presentación, sin que ello genere obligación de reembolso.</p>
            <p>La admisión estará sujeta al cumplimiento de las normas de seguridad y convivencia establecidas por SCW.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO V - CAMBIOS DE CARTELERA Y PROGRAMACIÓN</h3>
            <p>SCW podrá realizar modificaciones cuando existan circunstancias tales como lesiones de talento, problemas de transporte, problemas migratorios, enfermedades, casos fortuitos, fuerza mayor, requerimientos de autoridades, o razones operativas o administrativas.</p>
            <p>Las modificaciones no generarán responsabilidad para SCW.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO VI - INGRESO DE MENORES</h3>
            <p>Los eventos organizados por SCW son aptos para todo público. Los menores de edad podrán ingresar a los eventos.</p>
            <p>Los padres o tutores serán responsables de la supervisión, conducta y seguridad de los menores bajo su cuidado.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO VII - USO DE IMAGEN</h3>
            <p>Al asistir a cualquier evento de SCW, el asistente autoriza de manera gratuita, irrevocable y sin limitación territorial el uso de su imagen, voz y apariencia para fines promocionales, publicitarios, informativos, editoriales, históricos y comerciales.</p>
            <p>SCW podrá utilizar dicho material en sitio web, redes sociales, streaming, publicidad impresa, campañas futuras y material institucional. Esta autorización no generará compensación económica alguna.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO VIII - CONDUCTA DEL PÚBLICO</h3>
            <p>SCW se reserva el derecho de admisión y permanencia. Podrá negarse el acceso o retirarse a cualquier persona que ponga en riesgo la seguridad, agreda física o verbalmente a terceros, lance objetos, cause daños a instalaciones, interfiera con el desarrollo del espectáculo, o incumpla indicaciones de seguridad.</p>
            <p>La expulsión no dará derecho a reembolso.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO IX - LIMITACIÓN DE RESPONSABILIDAD</h3>
            <p>SCW no será responsable por robo o pérdida de objetos personales, daños ocasionados por terceros, conductas indebidas de asistentes, incidentes derivados del incumplimiento de normas de seguridad, suspensiones por condiciones climáticas, actos de autoridad, casos fortuitos o fuerza mayor.</p>
            <p>SCW implementará medidas razonables para proteger la seguridad de asistentes, talento y personal.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO X - TIENDA EN LÍNEA</h3>
            <p>Todos los productos están sujetos a disponibilidad. Las fotografías son ilustrativas y pueden existir ligeras variaciones respecto al producto final.</p>
            <p>SCW podrá corregir errores tipográficos, descripciones incorrectas o precios publicados por error.</p>
            <p>Los tiempos de entrega son estimados y pueden variar por causas logísticas externas. Las devoluciones procederán únicamente en los casos permitidos por la legislación aplicable.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XI - PROMOCIONES, SORTEOS Y DINÁMICAS</h3>
            <p>Toda promoción estará sujeta a bases específicas. SCW podrá modificar, suspender o cancelar promociones cuando existan causas justificadas.</p>
            <p>Las decisiones adoptadas por SCW respecto a ganadores, participantes o resultados tendrán carácter definitivo.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XII - PROTECCIÓN DE DATOS PERSONALES</h3>
            <p>SCW podrá recopilar los siguientes datos: Nombre completo, correo electrónico, número telefónico, dirección de envío, datos de facturación e información relacionada con compras y registros.</p>
            <p>Los datos serán utilizados para procesar compras, emitir boletos, entregar productos, atender consultas, gestionar promociones, enviar información relacionada con eventos y cumplir obligaciones legales.</p>
            <p>SCW implementará medidas razonables para proteger la información de los usuarios.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XIII - DERECHOS ARCO</h3>
            <p>Los usuarios podrán ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición mediante solicitud enviada al correo: contacto@scw-lucha.com.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XIV - COOKIES</h3>
            <p>SCW utiliza cookies para mejorar la experiencia de navegación, analizar tráfico, recordar preferencias, medir campañas publicitarias y optimizar el funcionamiento del sitio.</p>
            <p>El usuario podrá deshabilitarlas desde la configuración de su navegador.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XV - MODIFICACIONES</h3>
            <p>SCW podrá modificar la presente Política Legal Integral en cualquier momento. La versión vigente será la publicada en el sitio web oficial.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase border-b border-white/10 pb-2">CAPÍTULO XVI - LEGISLACIÓN APLICABLE</h3>
            <p>La presente política se regirá por las leyes vigentes de los Estados Unidos Mexicanos.</p>
            <p>Cualquier controversia será sometida a los tribunales competentes del Estado de Michoacán, renunciando las partes a cualquier otro fuero que pudiera corresponderles.</p>
          </section>
          
          <div className="text-center pt-8 text-sm text-zinc-500 border-t border-white/10">
            <p>STRONG CLASSIC WRESTLING (SCW)</p>
            <p>Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
