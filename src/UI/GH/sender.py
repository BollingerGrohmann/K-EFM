import Rhino.Geometry as rg
from Grasshopper.Kernel.Parameters import Param_Geometry, Param_Brep
from Grasshopper.Kernel.Special import GH_NumberSlider
from Grasshopper.Kernel.Data import GH_Path
from Grasshopper.Kernel.Types import GH_Brep
import Grasshopper  
import scriptcontext as sc
from System.Drawing import PointF
from System import Decimal

class MyComponent:

    @staticmethod
    def RunScript(gh_doc, component):
        # 1. Retrieve the EFM data from sticky
        EFM = sc.sticky.get("EFM", {})
        # Check if "GeomDict" -> "Elements" structure exists
        if ("GeomDict" not in EFM) or ("Elements" not in EFM["GeomDict"]):
            return []  # Nothing to place

        elements = EFM["GeomDict"]["Elements"]
        if not elements:
            # Remove all related components since elements list is empty
            objects_to_remove = [obj for obj in gh_doc.Objects 
                               if isinstance(obj, (Param_Brep, GH_NumberSlider))]
            for obj in objects_to_remove:
                gh_doc.RemoveObject(obj, False)
            return []  # List is empty, no param/slider needed
        
        # Get set of current element names from EFM
        current_element_names = {elem["name"] for elem in elements}
        
        # Remove components for elements that no longer exist
        objects_to_remove = []
        for obj in gh_doc.Objects:
            if isinstance(obj, Param_Brep):
                if obj.NickName not in current_element_names:
                    objects_to_remove.append(obj)
            elif isinstance(obj, GH_NumberSlider):
                base_name = obj.NickName.replace("_Thickness", "")
                if base_name not in current_element_names:
                    objects_to_remove.append(obj)
        
        for obj in objects_to_remove:
            gh_doc.RemoveObject(obj, False)
        
        # 2. Read existing GH nicknames so we don't duplicate
        existing_nicknames = set(obj.NickName for obj in gh_doc.Objects)

        # 3. For each element, create geometry param + slider if needed
        xPos = 100  # Starting X on canvas
        yPos = 200  # Starting Y on canvas

        for i, elem in enumerate(elements):
            elem_name = elem["name"]
            elem_thickness = elem["thickness"]
            elem_geometries = elem["geometries"]  # Actual Rhino surfaces in memory

            path = GH_Path(i)


            # --- A) Param_Geometry for the element ---
            if elem_name not in existing_nicknames:
                geo_param = Param_Brep()
                #geo_param = Param_Geometry()
                geo_param.Name = elem_name
                geo_param.NickName = elem_name
                geo_param.Description = "Holds geometry for " + elem_name
                geo_param.CreateAttributes()
                geo_param.Attributes.Pivot = PointF(xPos, yPos)

                # Instead of VolatileData:
                geo_param.PersistentData.ClearData()
                for j, srf in enumerate(elem_geometries):
                    # 1) Duplicate as trimmed single-face brep
                    face_brep = srf.DuplicateFace(True) 
                    # 2) Wrap in GH_Brep
                    gh_face_brep = GH_Brep(face_brep)


                    #geo_param.AddVolatileData(path, j, gh_brep)
                    geo_param.PersistentData.Append(gh_face_brep)
                gh_doc.AddObject(geo_param, False)
                existing_nicknames.add(elem_name)

                # (Optional) To truly "internalize" geometry, you'd need to assign
                # VolatileData in some advanced code. Typically, GH expects geometry
                # to come via wires or external references rather than internal code.

                yPos += 80  # Shift downward for the next item

            # --- B) GH_NumberSlider for the thickness ---
            slider_name = f"{elem_name}_Thickness"
            if slider_name not in existing_nicknames:
                slider = GH_NumberSlider()
                slider.Name = slider_name
                slider.NickName = slider_name
                slider.Slider.Minimum = Decimal(0.0)
                slider.Slider.Maximum = Decimal(10000.0)
                slider.Slider.Value = Decimal(elem_thickness)
                slider.CreateAttributes()
                slider.Attributes.Pivot = PointF(xPos + 150, yPos)

                gh_doc.AddObject(slider, False)
                existing_nicknames.add(slider_name)

                yPos += 80  # Shift for the next item

        

        # 4. Force Grasshopper to finalize layout
        def on_solution_end(doc):
            doc.NewSolution(False)

        gh_doc.ScheduleSolution(1, on_solution_end)
        
        return elements

