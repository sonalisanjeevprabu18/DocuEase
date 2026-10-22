"""Demo mode: pre-written sample explanations that need NO AI call.

The sample topic is photosynthesis; the canned answers are plain Markdown so
the demo exercises exactly the same UI path (format, language note, copy,
download, audio) as a real generation without spending a provider request.
"""

from __future__ import annotations

from .errors import ApiError
from .schemas import FORMAT_IDS

SAMPLE_FILENAME = "sample-photosynthesis.txt"

SAMPLE_DOCUMENT = """Photosynthesis: How Plants Make Food

Photosynthesis is the process plants use to convert light energy into chemical
energy. It takes place mainly in the leaves, inside cell structures called
chloroplasts, which contain the green pigment chlorophyll.

The overall equation is:
6CO2 + 6H2O + light energy -> C6H12O6 + 6O2

Key stages:
1. Light-dependent reactions: occur in the thylakoid membranes. Chlorophyll
   absorbs sunlight, water is split, oxygen is released, and the energy
   carriers ATP and NADPH are produced.
2. Light-independent reactions (Calvin cycle): occur in the stroma. Carbon
   dioxide from the air is fixed into glucose using the ATP and NADPH made in
   the first stage.

Factors that affect the rate of photosynthesis are light intensity, carbon
 dioxide concentration, and temperature. When any one of these is in short
 supply, it becomes the limiting factor.

Why it matters: photosynthesis is the foundation of most food chains and is
responsible for the oxygen in Earth's atmosphere.
"""

_DEMO_NOTE_EN = ""

_DEMO_NOTE_OTHER = (
    "> Note: Demo mode returns this pre-written English sample without calling "
    "any AI provider. Choose a real document to see output in your selected "
    "language.\n\n"
)

OUTPUTS: dict[str, str] = {
    "short_summary": (
        "Photosynthesis is the process by which plants convert light energy "
        "into chemical energy stored as glucose. Taking place mainly in "
        "chloroplasts of leaf cells, it has two stages: light-dependent "
        "reactions that split water and release oxygen while producing ATP "
        "and NADPH, and the Calvin cycle that uses those carriers to fix "
        "carbon dioxide into glucose. The rate is limited by light "
        "intensity, carbon dioxide concentration and temperature, and the "
        "process underpins most food chains and Earth's atmospheric oxygen."
    ),
    "detailed_summary": (
        "# Detailed summary: Photosynthesis\n\n"
        "## What it is\n"
        "Photosynthesis is the process plants use to turn light energy into "
        "chemical energy. It occurs mainly in leaves, inside chloroplasts "
        "containing the green pigment chlorophyll.\n\n"
        "## The overall reaction\n"
        "6CO2 + 6H2O + light energy -> C6H12O6 + 6O2 (carbon dioxide plus "
        "water, powered by light, yields glucose and oxygen).\n\n"
        "## The two stages\n"
        "1. **Light-dependent reactions** (thylakoid membranes): chlorophyll "
        "absorbs sunlight, water is split, oxygen is released, and ATP and "
        "NADPH are produced.\n"
        "2. **Light-independent reactions / Calvin cycle** (stroma): carbon "
        "dioxide is fixed into glucose using the ATP and NADPH from stage one.\n\n"
        "## Limiting factors\n"
        "Light intensity, carbon dioxide concentration and temperature each "
        "limit the rate; whichever is scarcest acts as the limiting factor.\n\n"
        "## Why it matters\n"
        "It is the foundation of most food chains and the source of the "
        "oxygen in Earth's atmosphere."
    ),
    "beginner": (
        "**In one sentence:** Plants cook their own food using sunlight, air "
        "and water, and they release the oxygen we breathe as a result.\n\n"
        "Imagine a plant as a tiny solar-powered kitchen. The green colour in "
        "its leaves (chlorophyll) catches sunlight the way a solar panel "
        "would. Inside the leaf, the plant mixes water from the soil with "
        "carbon dioxide from the air.\n\n"
        "This happens in two steps:\n"
        "- **Step 1 - sunlight step:** the leaf uses light energy to split "
        "water. Oxygen floats away (that is the 'fresh air' plants give us), "
        "and the leaf packs the energy into two tiny batteries called ATP and "
        "NADPH.\n"
        "- **Step 2 - sugar step:** using those batteries, the plant grabs "
        "carbon dioxide and turns it into sugar (glucose), which it uses as "
        "food to grow.\n\n"
        "The process speeds up with more light, more CO2 or warmer "
        "temperature, and slows down when one of them runs low."
    ),
    "bullet_points": (
        "# Key points\n\n"
        "- Photosynthesis converts light energy into chemical energy (glucose).\n"
        "- It happens mainly in leaves, inside chloroplasts.\n"
        "- Chlorophyll, the green pigment, absorbs the light.\n"
        "- Equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.\n"
        "- Stage 1 (light-dependent): water splits, oxygen released, ATP and "
        "NADPH produced.\n"
        "- Stage 2 (Calvin cycle): CO2 is fixed into glucose using ATP/NADPH.\n"
        "- Light intensity, CO2 concentration and temperature limit the rate.\n"
        "- The scarcest of those three becomes the limiting factor.\n"
        "- Photosynthesis supports most food chains.\n"
        "- It produced the oxygen in Earth's atmosphere."
    ),
    "concepts": (
        "| Concept | Definition |\n|---|---|\n"
        "| Photosynthesis | The process of converting light energy into "
        "chemical energy stored as glucose. |\n"
        "| Chlorophyll | Green pigment in chloroplasts that absorbs light. |\n"
        "| Chloroplast | Organelle where photosynthesis takes place. |\n"
        "| Light-dependent reactions | Stage in the thylakoid membranes that "
        "splits water, releases oxygen and forms ATP/NADPH. |\n"
        "| Calvin cycle | Light-independent stage in the stroma that fixes CO2 "
        "into glucose. |\n"
        "| Limiting factor | The scarcest resource (light, CO2 or temperature) "
        "that caps the reaction rate. |\n"
        "| Glucose | Sugar produced as the energy-rich product of "
        "photosynthesis. |"
    ),
    "study_notes": (
        "# Study notes - Photosynthesis\n\n"
        "## Definition\n- Light energy -> chemical energy (glucose); occurs in "
        "chloroplasts of leaf cells.\n\n"
        "## Equation\n- 6CO2 + 6H2O + light -> C6H12O6 + 6O2\n\n"
        "## Stage 1: Light-dependent reactions\n"
        "- Location: thylakoid membranes\n"
        "- Inputs: light, water\n"
        "- Outputs: oxygen, ATP, NADPH\n\n"
        "## Stage 2: Calvin cycle\n"
        "- Location: stroma\n"
        "- Inputs: CO2, ATP, NADPH\n"
        "- Outputs: glucose\n\n"
        "## Limiting factors\n"
        "- Light intensity, CO2 concentration, temperature\n"
        "- The lowest one controls the overall rate\n\n"
        "## Key takeaways\n"
        "- Foundation of food chains; source of atmospheric oxygen."
    ),
    "qa": (
        "**Q1: What is photosynthesis?**  \nA1: The process plants use to "
        "convert light energy into chemical energy stored as glucose.\n\n"
        "**Q2: Where does it take place?**  \nA2: Mainly in leaves, inside "
        "chloroplasts.\n\n"
        "**Q3: What is chlorophyll?**  \nA3: The green pigment that absorbs "
        "light energy.\n\n"
        "**Q4: What is the overall equation?**  \nA4: 6CO2 + 6H2O + light "
        "energy -> C6H12O6 + 6O2.\n\n"
        "**Q5: What happens in the light-dependent reactions?**  \nA5: Water "
        "is split, oxygen is released, and ATP and NADPH are produced in the "
        "thylakoid membranes.\n\n"
        "**Q6: What happens in the Calvin cycle?**  \nA6: Carbon dioxide is "
        "fixed into glucose in the stroma using ATP and NADPH.\n\n"
        "**Q7: What are the limiting factors?**  \nA7: Light intensity, "
        "carbon dioxide concentration and temperature; the scarcest one limits "
        "the rate.\n\n"
        "**Q8: Why does photosynthesis matter?**  \nA8: It underpins most "
        "food chains and produced Earth's atmospheric oxygen."
    ),
    "section_wise": (
        "# Section-wise explanation\n\n"
        "## Introduction\nDefines photosynthesis as the conversion of light "
        "energy into chemical energy, occurring in chloroplasts in the leaves.\n\n"
        "## The overall equation\nStates the inputs (CO2, water, light) and "
        "products (glucose, oxygen) of the reaction.\n\n"
        "## Stage 1 - Light-dependent reactions\nExplains where they happen "
        "(thylakoids), how chlorophyll absorbs light, how water is split, "
        "oxygen released, and ATP/NADPH generated.\n\n"
        "## Stage 2 - Light-independent reactions\nExplains the Calvin cycle "
        "in the stroma, using ATP and NADPH to fix CO2 into glucose.\n\n"
        "## Limiting factors\nLight intensity, CO2 concentration and "
        "temperature; the scarcest becomes the limiting factor.\n\n"
        "## Why it matters\nPhotosynthesis supports food chains and supplies "
        "atmospheric oxygen."
    ),
}


def demo_output(format_id: str, language: str) -> str:
    if format_id not in FORMAT_IDS:
        raise ApiError(
            f"Unknown format '{format_id}'.", code="format_unsupported",
            status_code=422,
        )
    body = OUTPUTS[format_id]
    if language != "en":
        return _DEMO_NOTE_OTHER + body
    return body
