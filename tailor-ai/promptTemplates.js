// promptTemplates.js - Fixed version for perfect flat lay (no cropping)

const PRODUCT_PHOTOGRAPHY_TEMPLATES = {

    // ========================================
    // PERFECT CLEAN E-COMMERCE (Like Image 2)
    // All items fit perfectly within canvas
    // ========================================
    clean_ecommerce: `Professional flat lay product photography of {PRODUCT_TYPE} arranged on pure white background.

EXACT LAYOUT (ALL items FULLY visible, NOTHING cropped):

TOP ROW:
- Black rectangular sunglasses (centered top, small size)

MIDDLE ROW (main focus):
- Left side: Charcoal gray straight-leg jeans, folded lengthwise showing front
- Center: {TEXT_REQUIREMENTS} sweatshirt, laid flat, COMPLETE garment from neck to hem visible
- Right side: Black leather shoulder bag with curved handle

BOTTOM ROW:
- Left: Single silver chain link bracelet (one only)
- Right: One pair chunky sneakers with tan/gum sole

CRITICAL RULES:
- Total {ITEM_COUNT} items only
- Each item COMPLETELY within frame with generous margins
- Sweatshirt FULLY visible including ribbed hem at bottom
- NO items touching canvas edges
- Compact centered arrangement
- Equal spacing between all items
- {COMPOSITION_RULE_1}
- {COMPOSITION_RULE_2}

PHOTOGRAPHY STYLE:
- Canon EOS R5, 50mm lens, f/8, overhead shot
- Soft even studio lighting, no harsh shadows
- Pure white background (#FFFFFF)
- Professional e-commerce quality like Zara, ASOS, H&M
- Realistic fabric textures: {MATERIAL_DETAILS}
- Natural wrinkles, stitching details visible
- Subtle soft shadows beneath items only

STRICTLY AVOID:
- {AVOID_1}
- {AVOID_2}  
- {AVOID_3}
- Items cut off at canvas edges
- Overcrowded composition
- Items extending beyond visible frame

Clean, professional, minimalist fashion product photography.`,

    // ========================================
    // COMPACT VERSION (Shorter prompt, same quality)
    // ========================================
    compact_ecommerce: `Flat lay of {PRODUCT_TYPE} on white background, ALL items fully visible.

LAYOUT (compact grid, nothing cropped):
Top: Sunglasses (center)
Middle row: Gray jeans (left), {TEXT_REQUIREMENTS} sweatshirt (center), black bag (right)
Bottom: Chain bracelet (left), sneakers with tan sole (right)

RULES:
- {ITEM_COUNT} items total, each COMPLETE within frame
- Generous margins around all items
- {COMPOSITION_RULE_1}
- {COMPOSITION_RULE_2}
- Professional e-commerce style

QUALITY: Studio lighting, realistic {MATERIAL_DETAILS}, soft shadows, Canon 50mm.

AVOID: {AVOID_1}, {AVOID_2}, {AVOID_3}, cropped items, edges touching frame.`,

    // ========================================
    // ULTRA-SAFE VERSION (Maximum control)
    // ========================================
    safe_flatlay: `E-commerce flat lay: {PRODUCT_TYPE} on white.

CENTERED GRID (all visible):
- Top center: sunglasses
- Left: gray jeans  
- Center: brown sweatshirt with "{TEXT_REQUIREMENTS}"
- Right: black bag
- Bottom left: silver chain
- Bottom right: tan/black sneakers

{ITEM_COUNT} items, NONE touching edges, compact arrangement.

Studio photo, {MATERIAL_DETAILS}, professional quality.

NO: {AVOID_1}, {AVOID_2}, {AVOID_3}, cropping.`,

    // ========================================
    // MINIMALIST (Safest for API)
    // ========================================
    minimal_safe: `Product flat lay: {PRODUCT_TYPE} on white background.

Items arranged in compact grid, all fully visible:
{LAYOUT_DESCRIPTION}

{ITEM_COUNT} items total. Professional e-commerce photography.

Avoid: {AVOID_1}, {AVOID_2}, {AVOID_3}.`
};

function generatePrompt(templateName, variables) {
    let template = PRODUCT_PHOTOGRAPHY_TEMPLATES[templateName];

    if (!template) {
        const available = Object.keys(PRODUCT_PHOTOGRAPHY_TEMPLATES).join(', ');
        throw new Error(`Template '${templateName}' not found. Available: ${available}`);
    }

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    // Remove any leftover placeholders
    template = template.replace(/{[A-Z_0-9]+}/g, '');

    // Check length
    const length = template.trim().length;
    if (length > 3800) {
        console.warn(`⚠️  Prompt is ${length} chars. Consider using 'compact_ecommerce' or 'safe_flatlay'.`);
    } else {
        console.log(`✅ Prompt length: ${length} chars (safe)`);
    }

    return template.trim();
}

function listTemplates() {
    console.log("\n📚 ========== AVAILABLE TEMPLATES ==========");

    console.log("\n1. clean_ecommerce ⭐ RECOMMENDED");
    console.log("   → Like your Image 2 - perfect fit, no cropping");
    console.log("   → ~2800 characters");

    console.log("\n2. compact_ecommerce");
    console.log("   → Shorter version, same quality");
    console.log("   → ~1800 characters");

    console.log("\n3. safe_flatlay");
    console.log("   → Maximum safety against cropping");
    console.log("   → ~1200 characters");

    console.log("\n4. minimal_safe");
    console.log("   → Simplest, most reliable");
    console.log("   → ~600 characters");

    console.log("\n============================================\n");
}

function getTemplateVariables(templateName) {
    const template = PRODUCT_PHOTOGRAPHY_TEMPLATES[templateName];
    if (!template) return [];

    const matches = template.match(/{([A-Z_0-9]+)}/g) || [];
    return [...new Set(matches.map(v => v.slice(1, -1)))];
}

module.exports = {
    PRODUCT_PHOTOGRAPHY_TEMPLATES,
    generatePrompt,
    listTemplates,
    getTemplateVariables
};