from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

OUT = Path('deliverables/diagrams')
OUT.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path(r'C:\Windows\Fonts')

def font(size, bold=False, italic=False):
    names = []
    if bold and italic:
        names = ['arialbi.ttf']
    elif bold:
        names = ['arialbd.ttf']
    elif italic:
        names = ['ariali.ttf']
    else:
        names = ['arial.ttf']
    for name in names:
        p = FONT_DIR / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

INK = '#172033'
MUTED = '#5d687a'
BLUE = '#dbeafe'
BLUE_D = '#1d4ed8'
GREEN = '#dcfce7'
GREEN_D = '#15803d'
AMBER = '#fef3c7'
AMBER_D = '#b45309'
PURPLE = '#f3e8ff'
PURPLE_D = '#7e22ce'
ROSE = '#ffe4e6'
ROSE_D = '#be123c'
SLATE = '#f1f5f9'
LINE = '#536179'
WHITE = '#ffffff'

def canvas(w=2400, h=1600, title=None, subtitle=None):
    im = Image.new('RGB', (w, h), WHITE)
    d = ImageDraw.Draw(im)
    if title:
        d.text((w//2, 45), title, font=font(48, True), fill=INK, anchor='ma')
    if subtitle:
        d.text((w//2, 105), subtitle, font=font(25), fill=MUTED, anchor='ma')
    return im, d

def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, cur = [], ''
    for word in words:
        trial = word if not cur else cur + ' ' + word
        if draw.textbbox((0,0), trial, font=fnt)[2] <= max_width:
            cur = trial
        else:
            if cur: lines.append(cur)
            cur = word
    if cur: lines.append(cur)
    return lines

def box(draw, xy, text, fill=SLATE, outline=LINE, radius=24, fnt=None,
        text_fill=INK, width=3, subtitle=None, pad=20):
    x1,y1,x2,y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    fnt = fnt or font(28, True)
    lines = wrap(draw, text, fnt, x2-x1-2*pad)
    subfont = font(max(18, int(getattr(fnt, 'size', 28)*.72)))
    line_h = getattr(fnt, 'size', 28) + 7
    sub_lines = wrap(draw, subtitle, subfont, x2-x1-2*pad) if subtitle else []
    total = len(lines)*line_h + (10 + len(sub_lines)*(subfont.size+5) if sub_lines else 0)
    yy = (y1+y2-total)//2
    for line in lines:
        draw.text(((x1+x2)//2, yy), line, font=fnt, fill=text_fill, anchor='ma')
        yy += line_h
    if sub_lines:
        yy += 7
        for line in sub_lines:
            draw.text(((x1+x2)//2, yy), line, font=subfont, fill=MUTED, anchor='ma')
            yy += subfont.size+5
    return xy

def arrow(draw, start, end, color=LINE, width=5, label=None, dashed=False, label_offset=(0,-18)):
    x1,y1=start; x2,y2=end
    if dashed:
        length=math.hypot(x2-x1,y2-y1)
        if length:
            ux,uy=(x2-x1)/length,(y2-y1)/length
            pos=0
            while pos < length-18:
                a=pos; b=min(pos+16,length-18)
                draw.line((x1+ux*a,y1+uy*a,x1+ux*b,y1+uy*b),fill=color,width=width)
                pos+=28
    else:
        draw.line((x1,y1,x2,y2),fill=color,width=width)
    ang=math.atan2(y2-y1,x2-x1)
    ah=22
    pts=[(x2,y2),(x2-ah*math.cos(ang-.55),y2-ah*math.sin(ang-.55)),(x2-ah*math.cos(ang+.55),y2-ah*math.sin(ang+.55))]
    draw.polygon(pts,fill=color)
    if label:
        mx=(x1+x2)//2+label_offset[0]; my=(y1+y2)//2+label_offset[1]
        bb=draw.textbbox((mx,my),label,font=font(20),anchor='mm')
        draw.rounded_rectangle((bb[0]-8,bb[1]-4,bb[2]+8,bb[3]+4),radius=6,fill=WHITE)
        draw.text((mx,my),label,font=font(20),fill=color,anchor='mm')

def double_arrow(draw, a, b, **kw):
    arrow(draw,a,b,**kw); arrow(draw,b,a,**kw)

def save(im, name):
    path=OUT/name
    im.save(path, dpi=(180,180), optimize=True)
    print(path)

def architecture():
    im,d=canvas(2400,1720,'SmartBiz System Architecture','Mobile-first business management with independently owned service data')
    box(d,(90,250,510,430),'Mobile Application',BLUE,BLUE_D,subtitle='React Native + Expo\n8 business tabs')
    box(d,(90,515,510,695),'Web Dashboard',BLUE,BLUE_D,subtitle='Next.js + React\nmanagement console')
    box(d,(715,300,1685,520),'API Gateway',AMBER,AMBER_D,fnt=font(36,True),subtitle='JWT validation • X-User-Id propagation • route enforcement')
    box(d,(930,145,1470,250),'Eureka Discovery',SLATE,LINE,subtitle='service registration and lookup')
    double_arrow(d,(510,340),(715,390),label='HTTPS / JSON')
    double_arrow(d,(510,605),(715,450),label='HTTPS / JSON',label_offset=(0,20))
    double_arrow(d,(1200,300),(1200,250),label='discovery',label_offset=(100,0))
    services=[
        ('Auth & Billing','users • tokens • plans',BLUE,BLUE_D),
        ('Inventory','products • suppliers\nreservations',GREEN,GREEN_D),
        ('CRM','customers • leads',PURPLE,PURPLE_D),
        ('Sales','orders • payments\nanalytics',AMBER,AMBER_D),
        ('AI','insights • scans\nimport sessions',ROSE,ROSE_D),
    ]
    sx=[100,565,1030,1495,1960]
    d.line((270,650,2130,650),fill=LINE,width=5)
    arrow(d,(1200,520),(1200,650),color=LINE,width=5,label='service routes',label_offset=(115,0))
    for x,(name,sub,fillc,outc) in zip(sx,services):
        box(d,(x,720,x+340,910),name,fillc,outc,subtitle=sub)
        arrow(d,(x+170,650),(x+170,720),color=outc,width=4)
    # Databases
    db_labels=['Auth DB','Inventory DB','CRM DB','Sales DB','AI metadata']
    for x,label,(_,_,fillc,outc) in zip(sx,db_labels,services):
        box(d,(x+25,1050,x+315,1185),label,WHITE,outc,radius=60,fnt=font(25,True),subtitle='PostgreSQL / Neon')
        double_arrow(d,(x+170,910),(x+170,1050),color=outc,width=4,label='JPA')
    box(d,(770,1335,1190,1510),'Redis Cache',ROSE,ROSE_D,subtitle='paged products, suppliers,\ncustomers and leads')
    box(d,(1300,1335,1720,1510),'Gemini API',PURPLE,PURPLE_D,subtitle='chat, OCR-style invoice parsing,\nvoice and sales-file analysis')
    d.text((1200,1585),'Inter-service REST: Sales ↔ Inventory/CRM; AI reads authorised business context through service APIs',font=font(22,italic=True),fill=MUTED,anchor='mm')
    d.text((1200,1640),'Redis is used by Inventory/CRM list operations; Gemini is called only by the AI service',font=font(22,italic=True),fill=MUTED,anchor='mm')
    d.text((1200,1690),'Each service owns its schema; no direct cross-service database access',font=font(24,italic=True),fill=MUTED,anchor='mm')
    save(im,'smartbiz-system-architecture.png')

def context_dfd():
    im,d=canvas(2200,1400,'SmartBiz Context Diagram (DFD Level 0)','External entities and the single system boundary')
    box(d,(760,405,1440,980),'SMARTBIZ',AMBER,AMBER_D,radius=60,fnt=font(52,True),subtitle='authenticated business operations, analytics and AI assistance')
    actors=[
      ((70,280,480,500),'Business Owner','credentials • products • sales • leads'),
      ((70,830,480,1050),'Customer','purchase and payment information'),
      ((1720,250,2130,470),'Payment Providers','eSewa / Stripe status'),
      ((1720,610,2130,830),'Google Services','OAuth identity'),
      ((1720,970,2130,1190),'Gemini API','generated analysis'),
    ]
    for xy,name,sub in actors: box(d,xy,name,SLATE,LINE,subtitle=sub)
    double_arrow(d,(480,390),(760,545),label='manage / reports')
    double_arrow(d,(480,940),(760,840),label='sale details')
    double_arrow(d,(1440,550),(1720,360),label='checkout / verify')
    double_arrow(d,(1440,690),(1720,720),label='OAuth')
    double_arrow(d,(1440,860),(1720,1080),label='prompt / response')
    save(im,'smartbiz-dfd-level-0.png')

def level1_dfd():
    im,d=canvas(2400,1700,'SmartBiz Data-Flow Diagram (DFD Level 1)','Major processes, data stores and trusted external services')
    box(d,(45,250,345,430),'Business User',BLUE,BLUE_D,subtitle='authenticated commands')
    box(d,(2040,250,2355,430),'External Services',PURPLE,PURPLE_D,subtitle='Google • eSewa • Gemini')
    procs=[
      ((470,180,850,350),'1.0 Identity & Billing',BLUE,BLUE_D),
      ((1010,180,1390,350),'2.0 Inventory & Suppliers',GREEN,GREEN_D),
      ((1550,180,1930,350),'3.0 CRM & Leads',PURPLE,PURPLE_D),
      ((470,850,850,1020),'4.0 Sales & Payments',AMBER,AMBER_D),
      ((1010,850,1390,1020),'5.0 Analytics & AI',ROSE,ROSE_D),
      ((1550,850,1930,1020),'6.0 Import & Reconcile',SLATE,LINE),
    ]
    for xy,t,fc,oc in procs: box(d,xy,t,fc,oc)
    stores=[
      ((500,500,820,625),'D1 Auth/Billing DB',BLUE_D),
      ((1040,500,1360,625),'D2 Inventory DB',GREEN_D),
      ((1580,500,1900,625),'D3 CRM DB',PURPLE_D),
      ((500,1170,820,1295),'D4 Sales DB',AMBER_D),
      ((1040,1170,1360,1295),'D5 AI Metadata',ROSE_D),
      ((1580,1170,1900,1295),'D6 Redis Cache',ROSE_D),
    ]
    for xy,t,oc in stores: box(d,xy,t,WHITE,oc,radius=55,fnt=font(22,True))
    arrow(d,(345,330),(470,265),label='credentials',label_offset=(0,-22))
    arrow(d,(345,380),(470,935),label='sale command',label_offset=(-25,-18))
    double_arrow(d,(850,265),(2040,300),label='OAuth / checkout',label_offset=(0,-26))
    double_arrow(d,(850,900),(1010,350),label='reserve / commit',label_offset=(-10,-22))
    double_arrow(d,(850,970),(1550,350),label='customer update',label_offset=(40,18))
    double_arrow(d,(1390,900),(2040,370),label='Gemini context',label_offset=(35,-20))
    double_arrow(d,(1390,935),(1550,935),label='reviewed rows',label_offset=(0,-24))
    for px, top_y, store_y, color in [(660,350,500,BLUE_D),(1200,350,500,GREEN_D),(1740,350,500,PURPLE_D),(660,1020,1170,AMBER_D),(1200,1020,1170,ROSE_D),(1740,1020,1170,ROSE_D)]:
        double_arrow(d,(px,top_y),(px,store_y),color=color,width=4,label='read / write',label_offset=(76,0))
    d.text((1200,1455),'Selected inter-process flows are shown; every request remains tenant-scoped through the gateway identity context.',font=font(23,italic=True),fill=MUTED,anchor='mm')
    save(im,'smartbiz-dfd-level-1.png')

def erd():
    im,d=canvas(2600,1800,'SmartBiz Distributed Data Model','Core entities are grouped by the service that owns them')
    groups=[
      (70,180,600,790,'AUTH / BILLING',BLUE,BLUE_D,[('User','id, email, password_hash, role'),('Plan','id, name, limits'),('Subscription','id, user_id, status, period'),('Payment','id, provider, amount, status')]),
      (670,180,1290,1110,'INVENTORY',GREEN,GREEN_D,[('Product','id, user_id, category_id, stock'),('Category','id, user_id, name'),('Supplier','id, user_id, phone, balance'),('SupplierLedger','id, supplier_id, type, amount'),('StockReservation','id, sale_ref, status, expires_at')]),
      (1360,180,1930,790,'CRM',PURPLE,PURPLE_D,[('Customer','id, user_id, total_purchases, due'),('CustomerInteraction','id, customer_id, type, notes'),('Lead','id, user_id, stage, source, follow_up')]),
      (2000,180,2530,790,'SALES',AMBER,AMBER_D,[('Sale','id, user_id, customer_id*, total, status'),('SaleItem','id, sale_id, product_id*, qty, price'),('PaymentIntent','id, sale_id, provider, state')]),
      (790,1260,1810,1660,'AI',ROSE,ROSE_D,[('ImportSession','id, user_id, state, source_type'),('ImportArtifact','id, session_id, storage_ref'),('Reconciliation','id, session_id, proposed_action')]),
    ]
    positions={}
    for x1,y1,x2,y2,title,fc,oc,entities in groups:
        d.rounded_rectangle((x1,y1,x2,y2),radius=28,fill='#fbfdff',outline=oc,width=4)
        d.rectangle((x1,y1,x2,y1+72),fill=fc,outline=oc,width=3)
        d.text(((x1+x2)//2,y1+36),title,font=font(28,True),fill=oc,anchor='mm')
        eh=(y2-y1-100)//len(entities)
        yy=y1+88
        for name,fields in entities:
            bx=(x1+18,yy,x2-18,yy+eh-12)
            box(d,bx,name,WHITE,oc,radius=14,fnt=font(24,True),subtitle=fields,pad=12)
            positions[name]=bx
            yy+=eh
    d.rounded_rectangle((180,1140,2420,1225),radius=20,fill=SLATE,outline=LINE,width=3)
    d.text((1300,1165),'Cross-service identifiers (REST, not database foreign keys)',font=font(24,True),fill=INK,anchor='ma')
    d.text((1300,1200),'Sale.customer_id → CRM.Customer   •   SaleItem.product_id → Inventory.Product   •   StockReservation.sale_ref → Sales.Sale',font=font(21),fill=MUTED,anchor='ma')
    d.text((1300,1740),'Within-service cardinality: User 1—* Subscription; Plan 1—* Subscription; Category 1—* Product; Supplier 1—* Ledger; Customer 1—* Interaction; Sale 1—* SaleItem; ImportSession 1—* Artifact/Reconciliation',font=font(21,italic=True),fill=MUTED,anchor='mm')
    save(im,'smartbiz-distributed-data-model.png')

def sequence():
    im,d=canvas(2600,1850,'Record Sale and Online Payment Sequence','Stock is reserved first and committed only after successful payment verification')
    names=['Mobile/Web','API Gateway','Sales Service','Inventory Service','Payment Provider','CRM Service']
    xs=[170,610,1050,1490,1930,2370]
    colors=[BLUE_D,AMBER_D,AMBER_D,GREEN_D,PURPLE_D,PURPLE_D]
    for x,n,c in zip(xs,names,colors):
        box(d,(x-150,160,x+150,270),n,WHITE,c,radius=14,fnt=font(24,True))
        d.line((x,270,x,1690),fill='#94a3b8',width=3)
    steps=[
      (0,1,'1. POST /sales',330),
      (1,2,'2. authenticated user request',420),
      (2,3,'3. reserve(product, quantity)',510),
      (3,2,'4. reservation ID / insufficient stock',600),
      (2,4,'5. create payment intent',690),
      (4,0,'6. checkout / redirect',780),
      (0,4,'7. customer completes payment',870),
      (4,2,'8. callback + signed status',960),
      (2,4,'9. verify provider status',1050),
      (4,2,'10. verified SUCCESS',1140),
      (2,3,'11. commit reservation',1230),
      (3,2,'12. stock deducted atomically',1320),
      (2,5,'13. update purchase total / due',1410),
      (2,0,'14. confirmed sale + receipt',1500),
    ]
    for a,b,label,y in steps:
        direction=1 if xs[b]>xs[a] else -1
        arrow(d,(xs[a],y),(xs[b]-direction*12,y),color=colors[a],width=4,label=label,label_offset=(0,-19))
    d.rounded_rectangle((1475,1260,1840,1375),radius=16,fill=GREEN,outline=GREEN_D,width=3)
    d.text((1658,1300),'Inventory DB transaction',font=font(20,True),fill=GREEN_D,anchor='mm')
    d.text((1658,1340),'atomic commit or rollback',font=font(18),fill=MUTED,anchor='mm')
    d.text((1300,1760),'Failure branch: cancel/failed/expired payment → release reservation → no stock deduction → return failure state',font=font(25,italic=True),fill=ROSE_D,anchor='mm')
    save(im,'smartbiz-sale-payment-sequence.png')

def usecase():
    im,d=canvas(2400,1650,'SmartBiz Use-Case Overview','Primary capabilities by actor')
    # System boundary
    d.rounded_rectangle((470,150,1960,1510),radius=40,fill='#fbfdff',outline=LINE,width=4)
    d.text((1215,190),'SMARTBIZ SYSTEM',font=font(31,True),fill=INK,anchor='mm')
    actors=[(185,470,'Business Owner'),(185,1110,'Staff User'),(2200,410,'Payment Provider'),(2200,920,'Gemini API')]
    for x,y,name in actors:
        d.ellipse((x-28,y-70,x+28,y-14),outline=INK,width=4)
        d.line((x,y-14,x,y+70),fill=INK,width=4); d.line((x-55,y+20,x+55,y+20),fill=INK,width=4)
        d.line((x,y+70,x-50,y+135),fill=INK,width=4); d.line((x,y+70,x+50,y+135),fill=INK,width=4)
        d.text((x,y+165),name,font=font(23,True),fill=INK,anchor='ma')
    cases=[
      (760,320,'Authenticate & manage profile',BLUE,BLUE_D),
      (1260,320,'Manage subscription & billing',BLUE,BLUE_D),
      (1680,520,'Verify online payment',AMBER,AMBER_D),
      (760,620,'Manage products, categories & suppliers',GREEN,GREEN_D),
      (1320,670,'Record sale / POS',AMBER,AMBER_D),
      (760,940,'Manage customers & leads',PURPLE,PURPLE_D),
      (1320,1020,'View analytics & reports',ROSE,ROSE_D),
      (760,1260,'Scan invoices / import sales',SLATE,LINE),
      (1460,1290,'Ask AI & receive insight cards',ROSE,ROSE_D),
    ]
    for x,y,t,fc,oc in cases:
        w=440 if len(t)<29 else 560
        box(d,(x-w//2,y-75,x+w//2,y+75),t,fc,oc,radius=75,fnt=font(23,True))
    for y in [320,620,940,1260]: arrow(d,(300,520 if y<800 else 1160),(500,y),width=3)
    for y in [620,940,1260]: arrow(d,(300,1160),(500,y),width=3)
    arrow(d,(2050,410),(1890,520),color=AMBER_D,width=3)
    arrow(d,(2050,920),(1760,1290),color=ROSE_D,width=3)
    arrow(d,(980,320),(1040,320),label='includes billing',dashed=True,width=3)
    arrow(d,(1450,670),(1530,540),label='includes verification',dashed=True,width=3)
    save(im,'smartbiz-use-case-overview.png')

def deployment():
    im,d=canvas(2400,1550,'SmartBiz Deployment Topology','Containerised backend with managed data and AI services')
    box(d,(70,240,520,480),'Android / iOS Device',BLUE,BLUE_D,subtitle='Expo React Native app')
    box(d,(70,620,520,860),'Desktop Browser',BLUE,BLUE_D,subtitle='Next.js dashboard')
    d.rounded_rectangle((700,170,1690,1290),radius=35,fill='#fbfdff',outline=LINE,width=4)
    d.text((1195,215),'DOCKER COMPOSE HOST',font=font(31,True),fill=INK,anchor='mm')
    box(d,(880,280,1510,430),'API Gateway :8080',AMBER,AMBER_D)
    box(d,(880,500,1510,625),'Eureka :8761',SLATE,LINE)
    nodes=[('Auth :8081',760,720,BLUE,BLUE_D),('Inventory :8082',1080,720,GREEN,GREEN_D),('CRM :8083',1400,720,PURPLE,PURPLE_D),('Sales :8084',760,930,AMBER,AMBER_D),('AI :8085',1080,930,ROSE,ROSE_D),('Redis :6379',1400,930,ROSE,ROSE_D)]
    for name,x,y,fc,oc in nodes: box(d,(x-140,y-70,x+140,y+70),name,fc,oc,radius=16,fnt=font(22,True))
    box(d,(860,1120,1530,1235),'Internal bridge network',WHITE,LINE,radius=18,fnt=font(23,True),subtitle='health checks • environment-driven configuration')
    double_arrow(d,(520,360),(880,350),label='HTTPS')
    double_arrow(d,(520,740),(880,390),label='HTTPS')
    for x in [760,1080,1400]: arrow(d,(1195,430),(x,650),width=3)
    box(d,(1840,250,2310,480),'Neon PostgreSQL',GREEN,GREEN_D,subtitle='isolated databases per service')
    box(d,(1840,670,2310,900),'Gemini API',PURPLE,PURPLE_D,subtitle='generative analysis')
    box(d,(1840,1060,2310,1290),'eSewa / Stripe',AMBER,AMBER_D,subtitle='payment checkout and verification')
    double_arrow(d,(1690,550),(1840,365),label='TLS/JDBC')
    double_arrow(d,(1690,850),(1840,785),label='HTTPS')
    double_arrow(d,(1690,1050),(1840,1175),label='HTTPS')
    save(im,'smartbiz-deployment-topology.png')

def gantt():
    im,d=canvas(2400,1500,'SmartBiz Twelve-Week Development Plan','Incremental delivery from foundation to evaluation')
    left=560; top=270; cw=135; rh=92
    tasks=[
      ('Requirements & architecture',1,2,BLUE_D),
      ('Eureka, gateway & auth',2,3,BLUE_D),
      ('Inventory & suppliers',3,5,GREEN_D),
      ('CRM & lead pipeline',5,6,PURPLE_D),
      ('Sales, reservations & analytics',6,8,AMBER_D),
      ('Mobile application',4,9,BLUE_D),
      ('Web dashboard',7,10,BLUE_D),
      ('AI, scan & import workflows',8,10,ROSE_D),
      ('Caching, security & billing',9,11,LINE),
      ('Testing, deployment & report',10,12,GREEN_D),
    ]
    for i in range(13):
        x=left+i*cw
        d.line((x,top-40,x,top+len(tasks)*rh),fill='#d7dee9',width=2)
        if i<12: d.text((x+cw//2,top-85),f'W{i+1}',font=font(23,True),fill=INK,anchor='mm')
    for idx,(name,start,end,color) in enumerate(tasks):
        y=top+idx*rh
        d.text((left-30,y+rh//2),name,font=font(23),fill=INK,anchor='rm')
        d.line((left,y+rh,left+12*cw,y+rh),fill='#d7dee9',width=2)
        x1=left+(start-1)*cw+12; x2=left+end*cw-12
        d.rounded_rectangle((x1,y+20,x2,y+rh-20),radius=18,fill=color)
        d.text(((x1+x2)//2,y+rh//2),f'Weeks {start}–{end}',font=font(20,True),fill=WHITE,anchor='mm')
    save(im,'smartbiz-development-gantt.png')

def wireframes():
    im,d=canvas(2500,1700,'SmartBiz Interface Wireframes','Representative mobile and web task flows')
    screens=[(80,'Mobile Home',['Weekly revenue','Low-stock alert','AI insight card','Quick actions']),
             (620,'Inventory',['Search & filters','Product stock cards','Invoice scan FAB','Voice product entry']),
             (1160,'Point of Sale',['Product picker','Cart quantities','Customer selector','Payment method']),
             (1700,'Web Dashboard',['KPI cards','Revenue chart','Paginated table','Lead pipeline'])]
    for x,title,items in screens:
        wide=720 if x==1700 else 450
        d.rounded_rectangle((x,220,x+wide,1480),radius=42,fill='#f8fafc',outline=INK,width=5)
        d.rectangle((x,220,x+wide,350),fill=INK)
        d.text((x+wide//2,285),title,font=font(28,True),fill=WHITE,anchor='mm')
        yy=400
        for i,item in enumerate(items):
            h=180 if i==1 else 150
            d.rounded_rectangle((x+35,yy,x+wide-35,yy+h),radius=20,fill=WHITE,outline='#94a3b8',width=3)
            d.text((x+65,yy+35),item,font=font(24,True),fill=INK)
            if i==1:
                for k in range(3):
                    d.rectangle((x+65,yy+85+k*27,x+wide-70,yy+98+k*27),fill='#dbe4ef')
            else:
                d.rectangle((x+65,yy+85,x+wide-80,yy+105),fill='#dbe4ef')
            yy+=h+35
        if x!=1700:
            d.ellipse((x+wide-115,1360,x+wide-45,1430),fill=BLUE_D)
            d.text((x+wide-80,1395),'+',font=font(40,True),fill=WHITE,anchor='mm')
        else:
            d.rectangle((x+35,1390,x+wide-35,1450),fill=BLUE_D)
    save(im,'smartbiz-interface-wireframes.png')

if __name__ == '__main__':
    architecture(); context_dfd(); level1_dfd(); erd(); sequence(); usecase(); deployment(); gantt(); wireframes()
