import"./global-Dd8t204S.js";/* empty css                */const $={apiKey:"AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",authDomain:"bayanihan-5ce7e.firebaseapp.com",databaseURL:"https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"bayanihan-5ce7e",storageBucket:"bayanihan-5ce7e.appspot.com",messagingSenderId:"593123849917",appId:"1:593123849917:web:eb85a63a536eeff78ce9d4",measurementId:"G-ZTQ9VXXVV0"};firebase.initializeApp($);const k=firebase.auth(),u=firebase.database();let h,f=[];const C=document.querySelector("header"),b=document.getElementById("food-packs"),x=document.getElementById("hot-meals"),F=document.getElementById("water-liters"),w=document.getElementById("volunteers"),B=document.getElementById("amount-raised"),S=document.getElementById("inkind-donations");document.getElementById("search-input");k.onAuthStateChanged(n=>{if(!n){Swal.fire({icon:"error",title:"Authentication Required",text:"Please sign in to access the dashboard."}).then(()=>{window.location.href="../pages/login.html"});return}console.log(`Logged-in user UID: ${n.uid}`),u.ref(`users/${n.uid}`).once("value",a=>{const g=a.val();if(!g||!g.role){console.error(`User data not found for UID: ${n.uid}`),Swal.fire({icon:"error",title:"User Data Missing",text:"User role not found. Please contact an administrator."}).then(()=>{window.location.href="../pages/login.html"});return}const p=g.role,m=n.email;console.log(`Role of logged-in user (UID: ${n.uid}): ${p}`),console.log(`User Email: ${m}`),C.textContent=p==="AB ADMIN"?"Admin Dashboard":"Volunteer Dashboard",p==="AB ADMIN"?u.ref("activations").orderByChild("status").equalTo("active").on("value",l=>{f.forEach(i=>i.setMap(null)),f=[];const s=l.val();if(!s){console.log("No active activations found in Firebase.");return}console.log("Active activations:",s),Object.entries(s).forEach(([i,o])=>{if(!o.latitude||!o.longitude){console.warn(`Activation ${i} is missing latitude or longitude:`,o);return}const d={lat:parseFloat(o.latitude),lng:parseFloat(o.longitude)};console.log(`Creating marker for ${o.organization} at position:`,d);const t="../bayanihan/assets/images/AB_logo.png";console.log("Attempting to load logo from:",t);const c=new Image;c.src=t,c.onload=()=>{console.log("Logo loaded successfully for marker:",t);const r=new google.maps.Marker({position:d,map:h,title:o.organization,icon:{url:t,scaledSize:new google.maps.Size(50,50),labelOrigin:new google.maps.Point(25,-10)},label:{text:o.organization.slice(0,15)+(o.organization.length>15?"...":""),color:"#ffffff",fontSize:"14px",fontWeight:"bold",backgroundColor:"#007BFF",padding:"3px 6px",borderRadius:"5px"},animation:google.maps.Animation.DROP});f.push(r),console.log(`Marker created for ${o.organization}`);const e=new Image;e.src=t,e.onload=()=>{console.log("Logo loaded successfully for InfoWindow:",t),y(r,o,t)},e.onerror=()=>{console.error("Failed to load logo for InfoWindow:",t),y(r,o,null)}},c.onerror=()=>{console.error("Failed to load logo for marker:",t);const r=new google.maps.Marker({position:d,map:h,title:o.organization,icon:{url:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",scaledSize:new google.maps.Size(50,50),labelOrigin:new google.maps.Point(25,-10)},label:{text:o.organization.slice(0,15)+(o.organization.length>15?"...":""),color:"#ffffff",fontSize:"14px",fontWeight:"bold",backgroundColor:"#007BFF",padding:"3px 6px",borderRadius:"5px"},animation:google.maps.Animation.DROP});f.push(r),console.log(`Marker created with fallback for ${o.organization}`),y(r,o,null)}})},l=>{console.error("Error fetching activations for map:",l)}):document.querySelector(".map-container").style.display="none",u.ref("reports/approved").on("value",l=>{let s=0,i=0,o=0,d=0,t=0,c=0;const r=l.val();r?Object.values(r).forEach(e=>{if(console.log(`Report SubmittedBy: ${e.SubmittedBy}, Report Data:`,e),p==="ABVN"){const I=e.SubmittedBy?e.SubmittedBy.toLowerCase():"",E=m?m.toLowerCase():"";if(I!==E){console.log(`Skipping report for ABVN - SubmittedBy (${e.SubmittedBy}) does not match user email (${m})`);return}}s+=parseFloat(e.NoOfFoodPacks||0),i+=parseFloat(e.NoOfHotMeals||0),o+=parseFloat(e.LitersOfWater||0),d+=parseFloat(e.NoOfVolunteersMobilized||0),t+=parseFloat(e.TotalMonetaryDonations||0),c+=parseFloat(e.TotalValueOfInKindDonations||0)}):console.log("No approved reports found."),b.textContent=s.toLocaleString(),x.textContent=i.toLocaleString(),F.textContent=o.toLocaleString(),w.textContent=d.toLocaleString(),B.textContent=`₱${t.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,S.textContent=`₱${c.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,console.log(`Totals - Food Packs: ${s}, Hot Meals: ${i}, Water Liters: ${o}, Volunteers: ${d}, Monetary Donations: ${t}, In-Kind Donations: ${c}`)},l=>{console.error("Error fetching approved reports:",l),Swal.fire({icon:"error",title:"Error",text:"Failed to load dashboard data. Please try again later."}),b.textContent="0",x.textContent="0",F.textContent="0",w.textContent="0",B.textContent="₱0.00 (Error)",S.textContent="₱0.00 (Error)"})},a=>{console.error("Error fetching user data:",a),Swal.fire({icon:"error",title:"Error",text:"Failed to load user data. Please try again later."})})});function y(n,a,g){const p=new google.maps.InfoWindow({content:`
            <div class="bayanihan-infowindow" style="
                font-family: 'Arial', sans-serif;
                color: #333;
                padding: 15px;
                background: #FFFFFF;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                max-width: 300px;
                border-top: 5px solid #FF69B4; /* Pink accent */
                animation: slideIn 0.3s ease-out;
            ">
                <h3 style="
                    margin: 0 0 10px;
                    color: #007BFF; /* Blue */
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    ${g?`<img src="${g}" alt="Bayanihan Logo" style="width: 24px; height: 24px;" />`:'<span style="font-size: 24px;">🌟</span>'}
                    ${a.organization}
                </h3>
                <p style="margin: 5px 0;">
                    <strong style="color: #007BFF;">📍 Location:</strong>
                    <span style="color: #333;">${a.areaOfOperation}</span>
                </p>
                <p style="margin: 5px 0;">
                    <strong style="color: #007BFF;">🌍 Calamity:</strong>
                    <span style="color: #333;">${a.calamityType}${a.typhoonName?` (${a.typhoonName})`:""}</span>
                </p>
                <p style="margin: 5px 0;">
                    <strong style="color: #007BFF;">✅ Status:</strong>
                    <span style="color: #388E3C; font-weight: bold;">Active</span>
                </p>
            </div>
            <style>
                @keyframes slideIn {
                    0% { transform: translateY(10px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            </style>
        `});n.addListener("click",()=>{p.open(h,n)})}
