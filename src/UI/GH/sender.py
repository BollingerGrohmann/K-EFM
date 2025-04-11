import Rhino.Geometry as rg
from Grasshopper.Kernel.Parameters import Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Types import GH_Brep
import Grasshopper
import scriptcontext as sc
import Karamba

from System.Drawing import PointF
from System import Decimal
from System.Drawing import Color

#
# Helper function to connect two Grasshopper objects by NickName
#
def connect_by_nicknames(gh_doc, source_nickname, source_output_index, target_nickname, target_input_index):
    """
    Connect the object named `source_nickname`'s output at `source_output_index`
    to the object named `target_nickname`'s input at `target_input_index`.
    Both source and target are identified by their .NickName in gh_doc.Objects.
    """
    source_obj = None
    target_obj = None

    # 1. Locate the objects in the GH document
    for obj in gh_doc.Objects:
        if obj.NickName == source_nickname:
            source_obj = obj
        if obj.NickName == target_nickname:
            target_obj = obj

    # 2. Only proceed if both exist
    if not source_obj or not target_obj:
        return  # Could optionally print an error or raise an exception

    # 3. Figure out the correct 'output' from the source
    if hasattr(source_obj, "Params"):
        # It's a multi-output component
        if source_output_index < len(source_obj.Params.Output):
            source_output_param = source_obj.Params.Output[source_output_index]
        else:
            return  # Index out of range
    else:
        # It's a param (like Param_Brep); the param itself is the source
        source_output_param = source_obj

    # 4. Connect that source to the target's input at `target_input_index`
    if hasattr(target_obj, "Params"):
        if target_input_index < len(target_obj.Params.Input):
            target_obj.Params.Input[target_input_index].AddSource(source_output_param)
    else:
        # If the target is a param
        target_obj.AddSource(source_output_param)


#
# Helper function to remove GH objects that are no longer in the valid set
#
def remove_old_items(gh_doc, valid_names_set, sender_components):
    """
    Removes objects whose NickName is in 'sender_components' but not in 'valid_names_set'.
    Modifies 'sender_components' in place to remove the old NickNames.
    """
    to_remove = []
    for obj in gh_doc.Objects:
        if obj.NickName in sender_components:
            if obj.NickName not in valid_names_set:
                to_remove.append(obj)

    for obj in to_remove:
        sender_components.remove(obj.NickName)
        gh_doc.RemoveObject(obj, False)


#
# Helper function to find or create a Param_Brep
#
def get_or_create_param_brep(gh_doc, nickname, sender_components):
    """
    Returns a Param_Brep with the given NickName.
    If none exists, it creates one, adds it to gh_doc, updates sender_components.
    """
    # 1. Try to find existing
    for obj in gh_doc.Objects:
        if obj.NickName == nickname and isinstance(obj, Param_Brep):
            return obj

    # 2. Otherwise, create new
    new_param = Param_Brep()
    new_param.Name = nickname
    new_param.NickName = nickname
    new_param.CreateAttributes()
    gh_doc.AddObject(new_param, False)
    sender_components.add(nickname)
    return new_param


#
# Helper function to find or create a GH_NumberSlider
#
def get_or_create_slider(gh_doc, nickname, sender_components, min_val=0.0, max_val=100.0, init_val=50.0):
    """
    Finds or creates a GH_NumberSlider with the given NickName.
    Sets min, max, and init value. Adds to gh_doc if new.
    """
    for obj in gh_doc.Objects:
        if obj.NickName == nickname and isinstance(obj, GH_NumberSlider):
            return obj

    slider = GH_NumberSlider()
    slider.Name = nickname
    slider.NickName = nickname
    slider.Slider.Minimum = Decimal(min_val)
    slider.Slider.Maximum = Decimal(max_val)
    slider.Slider.Value = Decimal(init_val)
    slider.CreateAttributes()
    gh_doc.AddObject(slider, False)
    sender_components.add(nickname)
    return slider


#
# Helper function to find or create a Karamba Material param
#
def get_or_create_karamba_material_param(gh_doc, nickname, sender_components):
    """
    Finds or creates a Karamba.GHopper.Materials.Param_FemMaterial with the given NickName.
    """
    for obj in gh_doc.Objects:
        if obj.NickName == nickname and isinstance(obj, Karamba.GHopper.Materials.Param_FemMaterial):
            return obj

    param_mat = Karamba.GHopper.Materials.Param_FemMaterial()
    param_mat.Name = nickname
    param_mat.NickName = nickname
    param_mat.CreateAttributes()
    gh_doc.AddObject(param_mat, False)
    sender_components.add(nickname)
    return param_mat


#
# Helper function to position a list of GH objects in a column layout
#
def layout_section(gh_doc, nicknames_in_order, xPos, startY, item_spacing):
    """
    Assigns each object in 'nicknames_in_order' a Pivot of (xPos, currentY),
    incrementing currentY by 'item_spacing' after each object.
    Returns the final 'currentY' after placing them all.
    """
    currentY = startY
    for nickname in nicknames_in_order:
        # Find the object
        for obj in gh_doc.Objects:
            if obj.NickName == nickname:
                # Move it
                obj.Attributes.Pivot = PointF(xPos, currentY)
                currentY += item_spacing
                
                break
    return currentY


class MyComponent:
    @staticmethod
    def RunScript(gh_doc, component):
        """
        Main script implementing the layout logic with:
          - GH_Brep containers in one section (vertical list)
          - Sliders in another section below
          - Materials in another section below the sliders
        All sections re-flow top-to-bottom each time.
        """
        # ---------------------------------------------------------------------
        # 1. Get EFM from sticky, check for data
        # ---------------------------------------------------------------------
        EFM = sc.sticky.get("EFM", {})
        if ("GeomDict" not in EFM) or ("Elements" not in EFM["GeomDict"]):
            return []  # No elements to place

        elements = EFM["GeomDict"]["Elements"]

        # We track param breps + sliders in the same set
        sender_components = sc.sticky.get("sender_components", set())

        # We'll do the same for materials in a separate set
        mat_sender_components = sc.sticky.get("mat_sender_components", set())

        # ---------------------------------------------------------------------
        # 2. Build up the set of all valid NickNames we expect to see
        #    (so we can remove old ones not in EFM)
        # ---------------------------------------------------------------------
        # (A) Elements => GH_Breps
        element_brep_nicknames = [elem["name"] for elem in elements]
        # (B) Sliders => "name_Thickness"
        element_slider_nicknames = [f"{elem['name']}_Thickness" for elem in elements]

        # (C) Materials => from EFM["MatDict"]["Materials"] if present
        material_nicknames = []
        if "MatDict" in EFM and "Materials" in EFM["MatDict"]:
            materials_list = EFM["MatDict"]["Materials"]
            for i, mat_data in enumerate(materials_list):
                mat_name = mat_data.get("name", f"Material_{i}")
                material_nicknames.append(mat_name)
        else:
            materials_list = []

        # Combine them for removing old items
        valid_names_for_elements = set(element_brep_nicknames + element_slider_nicknames)
        valid_names_for_materials = set(material_nicknames)

        # ---------------------------------------------------------------------
        # 3. Remove old items not in these sets
        # ---------------------------------------------------------------------
        remove_old_items(gh_doc, valid_names_for_elements, sender_components)
        remove_old_items(gh_doc, valid_names_for_materials, mat_sender_components)

        # ---------------------------------------------------------------------
        # 4. For each element, find/create GH_Brep + Slider, fill geometry
        # ---------------------------------------------------------------------
        for elem in elements:
            elem_name = elem["name"]
            brep_obj = get_or_create_param_brep(gh_doc, elem_name, sender_components)

            # Fill its geometry
            brep_obj.PersistentData.ClearData()
            for srf in elem["geometries"]:
                face_brep = srf.DuplicateFace(True)  # single-face brep
                brep_obj.PersistentData.Append(GH_Brep(face_brep))

            # Slider
            slider_name = elem_name + "_Thickness"
            slider_obj = get_or_create_slider(gh_doc, slider_name, sender_components,
                                              min_val=0.0, max_val=100.0, init_val=elem["thickness"])

        # ---------------------------------------------------------------------
        # 5. For each material, find/create param, fill data if needed
        # ---------------------------------------------------------------------
        for i, mat_data in enumerate(materials_list):
            mat_name = mat_data.get("name", f"Material_{i}")
            mat_param = get_or_create_karamba_material_param(gh_doc, mat_name, mat_sender_components)

            # Build the Karamba material
            if "Color" in mat_data:
                mat_color = mat_data["Color"]
                actual_karamba_mat = Karamba.Materials.FemMaterial_Isotrop(
                    mat_data.get("Family",  f"Material_{i}"),
                    mat_data.get("Name",    f"Material_{i}"),
                    mat_data.get("E",       0.0),
                    mat_data.get("G_in-plane", 0.0),
                    mat_data.get("G_transverse", 0.0),
                    mat_data.get("gamma", 0.0),
                    mat_data.get("ft", 0.0),
                    mat_data.get("fc", 0.0),
                    Karamba.Materials.FemMaterial.FlowHypothesisFromString(
                        mat_data.get("FlowHypothesis", "mises")
                    ),
                    mat_data.get("alphaT", 0.0),
                    Color.FromName(mat_color) if mat_color else Color.White
                )
                mat_param.PersistentData.ClearData()
                gh_mat_data = Karamba.GHopper.Materials.GH_FemMaterial(actual_karamba_mat)
                mat_param.PersistentData.Append(gh_mat_data)

        # ---------------------------------------------------------------------
        # 6. Lay out everything top-to-bottom
        # ---------------------------------------------------------------------
        # You can adjust these constants as you like:
        xPos = 900

        # spacing for GH_Breps
        g_y_spacing = 100

        # after GH_Breps are placed, skip some space before sliders
        slider_section_spacing = 80
        # spacing between each slider
        s_y_spacing = 60

        # after sliders, skip some space before materials
        material_section_spacing = 80
        # spacing between each material
        m_y_spacing = 60

        startY = 535  # top-most Y for the first GH_Brep

        # (A) Place all GH_Breps in order
        finalY = layout_section(gh_doc, element_brep_nicknames, xPos, startY, g_y_spacing)

        # (B) Add a gap, then place all sliders
        finalY += slider_section_spacing
        finalY = layout_section(gh_doc, element_slider_nicknames, xPos, finalY, s_y_spacing)

        # (C) Add a gap, then place all materials
        finalY += material_section_spacing
        finalY = layout_section(gh_doc, material_nicknames, xPos, finalY, m_y_spacing)

        # ---------------------------------------------------------------------
        # 7. Optionally connect param Breps to existing components
        #    e.g. "Stone Walls" => "Stream Filter" with NickName "_Stone Walls"
        # ---------------------------------------------------------------------
        # Example usage:
        connections_to_make = [
            ("Stone Walls", 0, "_Stone Walls", 1),
            ("Concrete Walls", 0, "_Concrete Walls", 1),
            ("Floors", 0, "_Floors", 1)
        ]
        for src_name, src_out, tgt_name, tgt_in in connections_to_make:
            connect_by_nicknames(gh_doc, src_name, src_out, tgt_name, tgt_in)

        # ---------------------------------------------------------------------
        # 8. Save updated sets, schedule final solution
        # ---------------------------------------------------------------------
        sc.sticky["sender_components"] = sender_components
        sc.sticky["mat_sender_components"] = mat_sender_components

        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)

        # If you want to output the elements list
        return elements
